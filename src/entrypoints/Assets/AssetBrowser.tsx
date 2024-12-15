import classNames from 'classnames';
import { RenderAssetSourceCtx } from 'datocms-plugin-sdk';
import {
  Button,
  CaretDownIcon,
  CaretUpIcon,
  Dropdown,
  DropdownMenu,
  DropdownOption,
  Spinner,
  TextField,
} from 'datocms-react-ui';
import { availableResolutionsArray } from '../Fields/DatoGPTPrompt';
import s from '../styles.module.css';
import { useState } from 'react';
import { availableResolutions } from '../../utils/generate/asset/generateUploadOnPrompt';
import OpenAI from 'openai';
import { ctxParamsType } from '../Config/ConfigScreen';
import ShapeGrid from '../../components/AssetBrowser/ShapeGrid';

type PropTypes = {
  ctx: RenderAssetSourceCtx;
};

export type ImageBlocks = {
  url: string;
  revisedPrompt: string;
  uploadedAssetURL: string;
  isUploading: boolean;
  id?: number;
};

const numberOfAssetsOptions = [1, 2, 4, 6] as const;
type NumberOfAssets = (typeof numberOfAssetsOptions)[number];

function getAspectRatio(resolution: string): number {
  const [width, height] = resolution.split('x').map(Number);
  return width / height;
}

const AssetBrowser = ({ ctx }: PropTypes) => {
  const [prompt, setPrompt] = useState('');
  const [selectedResolution, setSelectedResolution] =
    useState<availableResolutions>('1024x1024');
  const [numberOfAssets, setNumberOfAssets] = useState<NumberOfAssets>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [assetURLS, setAssetURLS] = useState<ImageBlocks[]>([]);

  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  const generateImages = async (
    resolution: availableResolutions,
    pluginParams: ctxParamsType,
    prompt: string
  ) => {
    const openai = new OpenAI({
      apiKey: pluginParams.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await openai.images.generate({
      model: pluginParams.dallEModel ?? 'dall-e-3',
      prompt,
      size: resolution,
    });

    return response.data[0];
  };

  const handlePrompt = async () => {
    setAssetURLS([]);
    setIsLoading(true);
    const promises = [];
    for (let i = 0; i < numberOfAssets; i++) {
      const promise = generateImages(selectedResolution, pluginParams, prompt)
        .then((upload) => {
          setAssetURLS((assetURLS) => [
            ...assetURLS,
            {
              url: upload.url!,
              revisedPrompt: upload.revised_prompt!,
              uploadedAssetURL: '',
              isUploading: false,
            },
          ]);
          return {
            url: upload.url!,
            revisedPrompt: upload.revised_prompt!,
            uploadedAssetURL: '',
            isUploading: false,
          };
        })
        .catch((error) => {
          setAssetURLS((assetURLS) => [
            ...assetURLS,
            {
              url: 'Error&' + error.message || error.error.message,
              revisedPrompt: error.message,
              uploadedAssetURL: '',
              isUploading: false,
            },
          ]);
          return {
            url: 'Error&' + error.message || error.error.message,
            revisedPrompt: error.message,
            uploadedAssetURL: '',
            isUploading: false,
          };
        });
      promises.push(promise);
    }
    Promise.all(promises).then(() => {
      setTimeout(() => {
        setIsLoading(false);
      }, 5000);
    });
  };

  return (
    <>
      <div
        className={classNames(s.promptBar)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isLoading) {
            handlePrompt();
          }
        }}
      >
        <TextField
          name="prompt"
          id="prompt"
          label=""
          value={prompt}
          placeholder="Write a prompt"
          onChange={(newValue) => setPrompt(newValue)}
        />

        <div className={classNames(s.dropdown)}>
          <Dropdown
            renderTrigger={({ open, onClick }) => (
              <Button
                onClick={onClick}
                buttonSize="m"
                rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
                disabled={isLoading}
              >
                {selectedResolution}
              </Button>
            )}
          >
            <DropdownMenu>
              {availableResolutionsArray.map((resolution) => {
                return (
                  <DropdownOption
                    key={resolution}
                    onClick={() => {
                      setAssetURLS([]);
                      setSelectedResolution(resolution);
                    }}
                  >
                    {resolution}
                  </DropdownOption>
                );
              })}
            </DropdownMenu>
          </Dropdown>
        </div>
        <div className={classNames(s.dropdown)}>
          <Dropdown
            renderTrigger={({ open, onClick }) => (
              <Button
                onClick={onClick}
                buttonSize="m"
                rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
                disabled={isLoading}
              >
                {`Generate ${numberOfAssets} assets`}
              </Button>
            )}
          >
            <div className={classNames(s.dropdownMenu)}>
              <DropdownMenu>
                {numberOfAssetsOptions.map((number) => {
                  return (
                    <DropdownOption
                      key={number}
                      onClick={() => {
                        setNumberOfAssets(number);
                      }}
                    >
                      {number}
                    </DropdownOption>
                  );
                })}
              </DropdownMenu>
            </div>
          </Dropdown>
        </div>

        <Button
          onClick={() => {
            handlePrompt();
          }}
          buttonSize="l"
          buttonType="primary"
          className={classNames(s.promptButton)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              Generating <Spinner size={24} />
            </>
          ) : (
            <>Prompt</>
          )}
        </Button>
      </div>
      <ShapeGrid
        blockCount={numberOfAssets}
        aspectRatio={getAspectRatio(selectedResolution)}
        uploadArray={assetURLS}
        isLoading={isLoading}
        promptString={prompt}
        setAssetURLS={setAssetURLS}
        ctx={ctx}
      />
    </>
  );
};

export default AssetBrowser;
