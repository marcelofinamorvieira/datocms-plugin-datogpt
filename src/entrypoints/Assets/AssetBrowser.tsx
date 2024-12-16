//********************************************************************************************
// AssetBrowser.tsx
//
// This file provides a user interface for generating and uploading AI-generated images
// as assets in DatoCMS. Users can type a prompt, select the resolution, and choose how many
// images to generate. The generated images are displayed in a grid, and each image can be uploaded
// to DatoCMS as an asset.
//********************************************************************************************

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
import { ImageBlocks as SharedImageBlocks } from '../../types/assetTypes';

//--------------------------------------------------------------------------------------------
// TYPE DEFINITIONS
//--------------------------------------------------------------------------------------------

/**
 * PropTypes for the main AssetBrowser component.
 * @property {RenderAssetSourceCtx} ctx - DatoCMS context for asset source rendering.
 */
type PropTypes = {
  ctx: RenderAssetSourceCtx;
};

/**
 * The allowed options for the number of assets to generate in a single request.
 */
const numberOfAssetsOptions = [1, 2, 4, 6] as const;

/**
 * A specialized type definition for the number of assets, ensuring we only use the allowed values.
 */
type NumberOfAssets = (typeof numberOfAssetsOptions)[number];

//--------------------------------------------------------------------------------------------
// HELPER FUNCTIONS
//--------------------------------------------------------------------------------------------

/**
 * Computes the aspect ratio of an image from its resolution string.
 * The resolution is in the format "WIDTHxHEIGHT", e.g. "1024x1024".
 *
 * @param {string} resolution - The resolution string (e.g., "1024x1024").
 * @returns {number} The aspect ratio (width/height).
 */
function getAspectRatio(resolution: string): number {
  const [width, height] = resolution.split('x').map(Number);
  return width / height;
}

//--------------------------------------------------------------------------------------------
// SUB-COMPONENT: PromptControls
//
// This internal sub-component encapsulates the prompt input field, the resolution dropdown,
// and the number-of-assets dropdown. It communicates user selections back to the parent
// component (AssetBrowser) through callback props.
//
// By extracting these controls into their own component, we simplify the main component and
// make it easier to understand and maintain.
//
// Props:
// - prompt: Current prompt string.
// - setPrompt: State setter for updating the prompt.
// - selectedResolution: Currently selected resolution for image generation.
// - setSelectedResolution: State setter for changing the resolution.
// - numberOfAssets: Current number of images to generate.
// - setNumberOfAssets: State setter for changing how many images to generate.
// - isLoading: Boolean indicating if image generation is in progress.
// - handlePrompt: Callback to trigger image generation.
//
// Events:
// - Pressing Enter inside the prompt TextField or clicking the "Prompt" button will trigger handlePrompt().
//--------------------------------------------------------------------------------------------
function PromptControls({
  prompt,
  setPrompt,
  selectedResolution,
  setSelectedResolution,
  numberOfAssets,
  setNumberOfAssets,
  isLoading,
  handlePrompt,
}: {
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  selectedResolution: availableResolutions;
  setSelectedResolution: React.Dispatch<
    React.SetStateAction<availableResolutions>
  >;
  numberOfAssets: NumberOfAssets;
  setNumberOfAssets: React.Dispatch<React.SetStateAction<NumberOfAssets>>;
  isLoading: boolean;
  handlePrompt: () => void;
}) {
  return (
    <div
      className={classNames(s.promptBar)}
      onKeyDown={(e) => {
        // If the user presses Enter inside the prompt field, trigger generation.
        if (e.key === 'Enter' && !isLoading) {
          handlePrompt();
        }
      }}
    >
      {/* Text input for the prompt. Users type their desired image prompt here. */}
      <TextField
        name="prompt"
        id="prompt"
        label=""
        value={prompt}
        placeholder="Write a prompt"
        onChange={(newValue) => setPrompt(newValue)}
      />

      {/* Dropdown for selecting the resolution of the generated images. */}
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
                    // When changing resolution, reset any existing generated assets.
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

      {/* Dropdown for selecting how many assets (images) to generate at once. */}
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
        </Dropdown>
      </div>

      {/* Button to initiate the prompt and generate images. */}
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
  );
}

//--------------------------------------------------------------------------------------------
// MAIN COMPONENT: AssetBrowser
//
// The main component allows the user to:
// 1. Enter a prompt to generate AI images.
// 2. Select a resolution and how many images to generate.
// 3. Display generated images in a grid. Each image can be uploaded to DatoCMS.
//
// Steps:
// - User sets prompt, resolution, and count.
// - On pressing "Prompt," it calls OpenAI to generate images.
// - The images are displayed using ShapeGrid.
// - User can click on each image to upload it as a DatoCMS asset.
//
// Props:
// @param {RenderAssetSourceCtx} ctx - DatoCMS render context, providing methods and tokens.
//
// State variables:
// - prompt: The user's input prompt string.
// - selectedResolution: The chosen resolution for image generation.
// - numberOfAssets: How many images to generate at once.
// - isLoading: Whether images are currently being generated.
// - assetURLS: An array of ImageBlocks (objects with url, prompt, upload states).
//--------------------------------------------------------------------------------------------
export default function AssetBrowser({ ctx }: PropTypes) {
  // Extract plugin parameters for API keys and model selections.
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  // State for user-controlled parameters.
  const [prompt, setPrompt] = useState('');
  const [selectedResolution, setSelectedResolution] =
    useState<availableResolutions>('1024x1024');
  const [numberOfAssets, setNumberOfAssets] = useState<NumberOfAssets>(4);

  // State for the loading indicator.
  const [isLoading, setIsLoading] = useState(false);

  // State for the generated images.
  const [assetURLS, setAssetURLS] = useState<SharedImageBlocks[]>([]);

  /**
   * Generates a single image from OpenAI based on the provided prompt and resolution.
   * Uses the pluginParams for API key and Dall-E model.
   *
   * @returns {Promise<{ url: string; revised_prompt: string }>} Object containing image URL and revised prompt.
   */
  async function generateSingleImage() {
    const openai = new OpenAI({
      apiKey: pluginParams.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await openai.images.generate({
      model: pluginParams.dallEModel ?? 'dall-e-3',
      prompt,
      size: selectedResolution,
    });

    // Return the first generated image with its revised prompt.
    return response.data[0];
  }

  /**
   * Handles the main "Prompt" action. This function:
   * - Clears any previously generated images.
   * - Sets loading state to true.
   * - Generates the requested number of images.
   * - Stores them in the assetURLS state.
   * - Stops loading once done.
   */
  const handlePrompt = async () => {
    setAssetURLS([]);
    setIsLoading(true);

    // Array of promises, each generating a single image.
    const promises = [];
    for (let i = 0; i < numberOfAssets; i++) {
      const promise = generateSingleImage()
        .then((upload) => {
          // On success, append this image to the assetURLS array.
          setAssetURLS((prev) => [
            ...prev,
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
          // On error, store an error message as the URL for debugging.
          setAssetURLS((prev) => [
            ...prev,
            {
              url:
                'Error&' +
                (error.message || error.error?.message || 'Unknown error'),
              revisedPrompt: error.message || 'Unknown error',
              uploadedAssetURL: '',
              isUploading: false,
            },
          ]);
          return {
            url:
              'Error&' +
              (error.message || error.error?.message || 'Unknown error'),
            revisedPrompt: error.message || 'Unknown error',
            uploadedAssetURL: '',
            isUploading: false,
          };
        });
      promises.push(promise);
    }

    // Once all images are generated (or attempted), stop loading.
    Promise.all(promises).then(() => {
      // Add a short delay to ensure a smooth UI update.
      setTimeout(() => {
        setIsLoading(false);
      }, 5000);
    });
  };

  //------------------------------------------------------------------------------------------
  // RENDER
  //
  // The component layout:
  // 1. PromptControls: prompt input, resolution and assets count selection, prompt button.
  // 2. ShapeGrid: Displays generated images in a grid layout, allowing asset upload.
  //------------------------------------------------------------------------------------------
  return (
    <>
      {/* Render prompt controls (prompt field, resolution dropdown, assets count dropdown, and prompt button) */}
      <PromptControls
        prompt={prompt}
        setPrompt={setPrompt}
        selectedResolution={selectedResolution}
        setSelectedResolution={setSelectedResolution}
        numberOfAssets={numberOfAssets}
        setNumberOfAssets={setNumberOfAssets}
        isLoading={isLoading}
        handlePrompt={handlePrompt}
      />

      {/* Render the generated images using ShapeGrid */}
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
}
