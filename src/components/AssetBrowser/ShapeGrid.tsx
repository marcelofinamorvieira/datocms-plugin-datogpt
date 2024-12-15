import { Button, Spinner } from 'datocms-react-ui';
import { motion } from 'framer-motion';
import { IoMdCloudUpload } from 'react-icons/io';
import {
  imageUrlToBlob,
  toKebabCase,
} from '../../utils/generate/asset/generateUploadOnPrompt';
import { buildClient } from '@datocms/cma-client-browser';
import { RenderAssetSourceCtx } from 'datocms-plugin-sdk';
import { ImageBlocks } from '../../entrypoints/Assets/AssetBrowser';
import { useEffect, useState } from 'react';

interface ShapeGridProps {
  blockCount: number;
  aspectRatio?: number;
  uploadArray: ImageBlocks[];
  ctx: RenderAssetSourceCtx;
  isLoading: boolean;
  promptString: string;
  setAssetURLS: React.Dispatch<React.SetStateAction<ImageBlocks[]>>;
}

async function urlToAsset(
  url: string,
  prompt: string,
  revised_prompt: string,
  locale: string,
  datoToken: string
) {
  const datoClient = buildClient({ apiToken: datoToken });

  console.log(url);
  console.log(toKebabCase(prompt) + '.png');

  const upload = await datoClient.uploads.createFromFileOrBlob({
    fileOrBlob: await imageUrlToBlob(url),
    filename: toKebabCase(prompt) + '.png',
    default_field_metadata: {
      [locale]: {
        title: prompt,
        alt: revised_prompt,
        custom_data: {},
      },
    },
  });

  console.log(upload);

  return upload;
}

const ShapeGrid: React.FC<ShapeGridProps> = ({
  blockCount,
  aspectRatio = 1,
  uploadArray,
  isLoading,
  promptString,
  ctx,
  setAssetURLS,
}) => {
  const gridSize = Math.ceil(Math.sqrt(blockCount));
  const isWiderThanTall = aspectRatio > 1;
  const [imagesArray, setImagesArray] = useState<ImageBlocks[]>([]);

  useEffect(() => {
    const newImagesArray = Array.from({ length: blockCount }, (_, index) => ({
      id: index,
      url: uploadArray[index]?.url || '',
      revisedPrompt: uploadArray[index]?.revisedPrompt || '',
      isUploading: uploadArray[index]?.isUploading || false,
      uploadedAssetURL: uploadArray[index]?.uploadedAssetURL || '',
    }));
    setImagesArray(newImagesArray);
  }, [uploadArray, blockCount]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gap: '32px',
        aspectRatio: isWiderThanTall ? 'auto' : 'auto',
        width: '100%',
        maxWidth: isWiderThanTall ? '100%' : 'none',
        gridAutoRows: isWiderThanTall ? 'auto' : '1fr',
      }}
    >
      {imagesArray.map((image) => {
        const imageHasError = image.url?.includes('Error');
        return (
          <div
            key={image.id}
            style={{
              aspectRatio: `${aspectRatio}`,
              borderRadius: '8px',
              maxWidth: '100%',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {
              <motion.div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: -1,
                  background:
                    'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                }}
                animate={
                  isLoading
                    ? {
                        backgroundPosition: ['200% 0', '-200% 0'],
                      }
                    : {
                        backgroundPosition: '0% 0',
                      }
                }
                transition={
                  isLoading
                    ? {
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'linear',
                      }
                    : {
                        duration: 0,
                      }
                }
              />
            }
            {imageHasError && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: '#f0f0f0',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <p>This image could not be generated</p>
                  <p>{image.url.split('&')[1]}</p>
                </div>
              </div>
            )}
            {image.url && !imageHasError && (
              <div
                style={{ position: 'relative', width: '100%', height: '100%' }}
              >
                <motion.img
                  src={image.url}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5, duration: 0.5 }}
                />
                <motion.div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'flex-end',
                    background: 'rgba(0, 0, 0, 0.15)',
                    opacity: 0,
                    padding: '10px',
                    cursor: image.isUploading ? 'default' : 'pointer',
                  }}
                  whileHover={{ opacity: 1 }}
                  onClick={() => {
                    if (image.uploadedAssetURL) {
                      ctx.navigateTo(image.uploadedAssetURL);
                    } else if (!image.isUploading) {
                      setAssetURLS((prevAssetURLS) =>
                        prevAssetURLS.map((prevImage) =>
                          prevImage.url === image.url
                            ? { ...prevImage, isUploading: true }
                            : prevImage
                        )
                      );
                      urlToAsset(
                        image.url,
                        promptString,
                        image.revisedPrompt,
                        ctx.site.attributes.locales[0],
                        ctx.currentUserAccessToken!
                      ).then((upload) => {
                        setAssetURLS((prevAssetURLS) =>
                          prevAssetURLS.map((prevImage) =>
                            prevImage.url === image.url
                              ? {
                                  ...prevImage,
                                  isUploading: false,
                                  uploadedAssetURL: `/media/assets/${upload.id}`,
                                }
                              : prevImage
                          )
                        );
                        ctx
                          .customToast({
                            type: 'notice',
                            message: 'Asset created!',
                            dismissOnPageChange: true,
                            dismissAfterTimeout: 10000,
                            cta: {
                              label: 'Go to Asset',
                              value: 'goToAsset',
                            },
                          })
                          .then((result) => {
                            if (result === 'goToAsset') {
                              ctx.navigateTo(`/media/assets/${upload.id}`);
                            }
                          });
                      });
                    }
                  }}
                >
                  {!image.uploadedAssetURL && (
                    <Button disabled={image.isUploading} buttonSize="s">
                      {image.isUploading && <Spinner size={32} />}
                      {!image.isUploading && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                        >
                          <IoMdCloudUpload size={32} /> Make into asset
                        </div>
                      )}
                    </Button>
                  )}
                  {image.uploadedAssetURL && <Button>Go to asset</Button>}
                </motion.div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ShapeGrid;
