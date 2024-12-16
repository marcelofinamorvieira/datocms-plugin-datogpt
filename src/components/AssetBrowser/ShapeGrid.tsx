//********************************************************************************************
// ShapeGrid.tsx
//
// This component displays a grid of generated images (blocks) and allows the user to upload
// them as assets to their DatoCMS account. It receives an array of image data, including URLs
// of generated images and related metadata, and displays them in a grid layout.
//
// Users can click on an image overlay to upload that image as a DatoCMS asset, or navigate
// to the associated asset page if it has already been uploaded.
//
// Key points:
// - The grid layout is determined by the number of images and their aspect ratio.
// - Each image can be individually uploaded to the CMS as a new asset.
// - When uploading, a spinner is shown, and once complete, a navigation button to the asset is provided.
//
//********************************************************************************************

import { Button, Spinner } from 'datocms-react-ui';
import { motion } from 'framer-motion';
import { IoMdCloudUpload } from 'react-icons/io';
import {
  imageUrlToBlob,
  toKebabCase,
} from '../../utils/generate/asset/generateUploadOnPrompt';
import { buildClient } from '@datocms/cma-client-browser';
import { RenderAssetSourceCtx } from 'datocms-plugin-sdk';
import { useMemo } from 'react';
import { ImageBlocks } from '../../types/assetTypes';

//--------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------

// ShapeGridProps: Props that the ShapeGrid component expects.
// blockCount:     The number of image blocks to display.
// aspectRatio:    Optional aspect ratio for each image block.
// uploadArray:    Array of ImageBlocks data (urls, prompts, upload states).
// ctx:            DatoCMS RenderAssetSourceCtx, giving us context like API tokens.
// isLoading:      Indicates if images are currently loading/generating.
// promptString:   The original prompt used to generate these images.
// setAssetURLS:   Setter function to update the array of ImageBlocks after an upload.
//--------------------------------------------------------------------------------------------
type ShapeGridProps = {
  blockCount: number;
  aspectRatio?: number;
  uploadArray: ImageBlocks[];
  ctx: RenderAssetSourceCtx;
  isLoading: boolean;
  promptString: string;
  setAssetURLS: React.Dispatch<React.SetStateAction<ImageBlocks[]>>;
}

//--------------------------------------------------------------------------------------------
// urlToAsset: Handles uploading an image from a given URL to DatoCMS as an asset.
// Parameters:
// - url: The image's URL to upload.
// - prompt: The original prompt used to generate this image.
// - revised_prompt: A possibly revised prompt returned by the model.
// - locale: The site locale for asset metadata (title, alt).
// - datoToken: DatoCMS API token for authenticated requests.
//
// Returns a promise that resolves to the newly created upload object.
//--------------------------------------------------------------------------------------------
async function urlToAsset(
  url: string,
  prompt: string,
  revised_prompt: string,
  locale: string,
  datoToken: string
) {
  const datoClient = buildClient({ apiToken: datoToken });

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
  return upload;
}

//--------------------------------------------------------------------------------------------
// ShapeGrid Component
//
// Responsibilities:
// - Render a square grid of image blocks.
// - Each block displays a generated image or an error message if generation failed.
// - On hover, shows a button to upload the image as an asset if not already uploaded,
//   or navigate to the asset if already uploaded.
// - Animates loading states via a skeleton-like shimmer when images are loading.
//
//--------------------------------------------------------------------------------------------
const ShapeGrid: React.FC<ShapeGridProps> = ({
  blockCount,
  aspectRatio = 1,
  uploadArray,
  isLoading,
  promptString,
  ctx,
  setAssetURLS,
}) => {
  // Compute grid size based on the number of blocks (square layout).
  const gridSize = Math.ceil(Math.sqrt(blockCount));

  // Determine if the generated images are wider than tall based on aspect ratio.
  const isWiderThanTall = aspectRatio > 1;

  // Derive imagesArray from uploadArray using useMemo for performance:
  // This ensures the component doesn't unnecessarily re-render or re-calculate state.
  const imagesArray: ImageBlocks[] = useMemo(
    () =>
      Array.from({ length: blockCount }, (_, index) => ({
        id: index,
        url: uploadArray[index]?.url || '',
        revisedPrompt: uploadArray[index]?.revisedPrompt || '',
        isUploading: uploadArray[index]?.isUploading || false,
        uploadedAssetURL: uploadArray[index]?.uploadedAssetURL || '',
      })),
    [blockCount, uploadArray]
  );

  return (
    <div
      style={{
        display: 'grid',
        // Create a square grid with equal columns and rows:
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gap: '32px',
        aspectRatio: isWiderThanTall ? 'auto' : 'auto',
        width: '100%',
        maxWidth: isWiderThanTall ? '100%' : 'none',
        gridAutoRows: isWiderThanTall ? 'auto' : '1fr',
      }}
    >
      {imagesArray.map((image) => {
        // Determine if there's an error in loading this particular image
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
            {/* Background shimmer animation during loading */}
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

            {/* If there's an error, show a fallback message */}
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

            {/* If the image loaded successfully, display it */}
            {image.url && !imageHasError && (
              <div
                style={{ position: 'relative', width: '100%', height: '100%' }}
              >
                {/* Fade-in animation for the image */}
                <motion.img
                  src={image.url}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5, duration: 0.5 }}
                />

                {/* Hover overlay for uploading or navigating to the asset */}
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
                    // If the asset is already uploaded, navigate to it
                    if (image.uploadedAssetURL) {
                      ctx.navigateTo(image.uploadedAssetURL);
                    } else if (!image.isUploading) {
                      // Otherwise, start the uploading process
                      setAssetURLS((prevAssetURLS) =>
                        prevAssetURLS.map((prevImage) =>
                          prevImage.url === image.url
                            ? { ...prevImage, isUploading: true }
                            : prevImage
                        )
                      );

                      // Upload the asset to DatoCMS
                      urlToAsset(
                        image.url,
                        promptString,
                        image.revisedPrompt,
                        ctx.site.attributes.locales[0],
                        ctx.currentUserAccessToken!
                      ).then((upload) => {
                        // Update the uploaded asset URL
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
                        // Show a notification and offer to navigate to the newly created asset
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
                  {/* If not uploaded yet, show a button to upload; if uploading, show spinner */}
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
                  {/* If already uploaded, show a button to navigate to the asset page */}
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
