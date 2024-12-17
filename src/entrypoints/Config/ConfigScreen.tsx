//********************************************************************************************
// ConfigScreen.tsx
//
// This file provides the main configuration screen for the plugin, allowing users to
// input their OpenAI API key and select the desired GPT and Dall-E models. It also provides
// navigation to advanced options pages.
//
// The component:
// - Reads current plugin parameters or sets defaults if none exist.
// - Allows the user to input an OpenAI API key.
// - Lets the user pick a GPT model and a Dall-E model after fetching available models from OpenAI.
// - Persists these choices in the plugin parameters.
// - Provides a button to navigate to advanced options.
//
// The file also exports types used throughout the plugin configuration:
// - FieldPrompts: A mapping of field types to their specific prompts.
// - AdvancedSettings: An object specifying advanced configuration for various plugin features.
// - ctxParamsType: The main plugin parameters type, bundling API keys, models, prompts, and advanced settings.
//
// Default prompts and configuration are provided if none are present.
//********************************************************************************************

import { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import {
  Button,
  Canvas,
  CaretDownIcon,
  CaretUpIcon,
  Dropdown,
  DropdownMenu,
  DropdownOption,
  Spinner,
  TextField,
} from 'datocms-react-ui';
import s from '../styles.module.css';
import { useEffect, useState } from 'react';
import OpenAI from 'openai';
import { basePrompt } from '../../prompts/BasePrompt';
import { AltGenerationPrompt } from '../../prompts/AltGenerationPrompt';
import { fieldPrompt } from '../../prompts/FieldPrompts';

//-------------------------------------------
// Type Definitions
//-------------------------------------------

// FieldPrompts: Defines individual prompts for each field type.
// Each field type is assigned a prompt guiding the model on how to format the output.
export type FieldPrompts = {
  single_line: string;
  markdown: string;
  wysiwyg: string;
  date_picker: string;
  date_time_picker: string;
  integer: string;
  float: string;
  boolean: string;
  map: string;
  color_picker: string;
  slug: string;
  json: string;
  seo: string;
  textarea: string;
};

// AdvancedSettings: Represents advanced configuration settings for the plugin.
// These include toggles and arrays controlling what fields can be generated/improved/translated,
// as well as settings for media permissions and block generation depth.
export type AdvancedSettings = {
  mediaAreaPermissions: boolean; // Allow generating assets in the media area
  translateWholeRecord: boolean; // Allow translation of the whole record from the sidebar
  generateAlts: boolean; // Allow generation of alt texts for assets
  mediaFieldsPermissions: boolean; // Allow generation of assets in media fields
  blockGenerateDepth: number; // Max depth of nested block generation
  blockAssetsGeneration: 'null' | 'generate'; // Controls asset generation for blocks
  translationFields: string[]; // Fields that have the 'Translate' option
  generateValueFields: string[]; // Fields that have the 'Generate value' option
  improveValueFields: string[]; // Fields that have the 'Improve current value' option
  seoGenerateAsset: boolean; // Controls whether to generate a new asset when generating SEO value
};

// ctxParamsType: Defines the plugin parameters stored in DatoCMS.
// It includes the API key, model choices, prompt configurations, and advanced settings.
export type ctxParamsType = {
  apiKey: string; // OpenAI API key
  gptModel: string; // Chosen GPT model (e.g., gpt-4)
  dallEModel: string; // Chosen Dall-E model (e.g., dall-e-3)
  prompts: {
    basePrompt: string; // Base prompt used globally
    altGenerationPrompt: string; // Prompt for alt text generation
    fieldPrompts: FieldPrompts; // Per-field-type prompts
  };
  advancedSettings: AdvancedSettings; // Advanced configuration settings
};

// saveApiKey:
// This async function updates the plugin parameters with the given API key and models,
// as well as the current prompts and advanced settings if they exist. It then notifies
// the user that the API key has been saved.
async function saveApiKey(
  ctx: RenderConfigScreenCtx,
  apiKey: string,
  gptModel: string,
  dallEModel: string,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  setIsLoading(true);
  await ctx.updatePluginParameters({
    apiKey,
    gptModel,
    dallEModel,
    prompts: ctx.plugin.attributes.parameters.prompts
      ? ctx.plugin.attributes.parameters.prompts
      : {
          basePrompt,
          altGenerationPrompt: AltGenerationPrompt,
          fieldPrompts: fieldPrompt,
        },
    advancedSettings: ctx.plugin.attributes.parameters.advancedSettings
      ? ctx.plugin.attributes.parameters.advancedSettings
      : {
          mediaAreaPermissions: true,
          translateWholeRecord: true,
          generateAlts: true,
          mediaFieldsPermissions: true,
          blockGenerateDepth: 3,
          blockAssetsGeneration: 'null',
          translationFields: Object.keys(fieldPrompt),
          generateValueFields: Object.keys(fieldPrompt),
          improveValueFields: Object.keys(fieldPrompt),
          seoGenerateAsset: false,
        },
  });
  setIsLoading(false);
  ctx.customToast({
    type: 'notice',
    message: 'API Key Saved!',
    dismissOnPageChange: false,
    dismissAfterTimeout: 5000,
  });
}

// fetchAvailableModels:
// Given an API key, this function uses the OpenAI client to fetch a list of available models.
// It then sets these models into state so they can be displayed in a dropdown for user selection.
async function fetchAvailableModels(
  apiKey: string,
  setOptions: React.Dispatch<React.SetStateAction<string[]>>
) {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const list = await openai.models.list();
  setOptions(list.data.map((option) => option.id));
}

// ConfigScreen Component:
// This is the main configuration screen that appears in the plugin settings.
// It displays:
// - An input for the OpenAI API key
// - Dropdowns to choose GPT and Dall-E models (populated after fetching available models)
// - A button to save these settings
// - A button to navigate to the "Advanced Options" page
//
// It initializes states for apiKey, model lists, and loading states. On component mount or
// after changes, it tries to fetch models if a valid API key is present.
export default function ConfigScreen({ ctx }: { ctx: RenderConfigScreenCtx }) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  const [apiKey, setApiKey] = useState(pluginParams.apiKey ?? '');
  const [listOfModels, setListOfModels] = useState([
    'Insert a valid OpenAI API Key',
  ]);
  const [gptModel, setGptModel] = useState(pluginParams.gptModel ?? 'None');
  const [dallEModel, setDallEModel] = useState(
    pluginParams.dallEModel ?? 'None'
  );
  const [isLoading, setIsLoading] = useState(false);

  // useEffect: Whenever the apiKey or isLoading changes, attempt to refetch the available models.
  // If the API key is empty, it won't fetch anything.
  useEffect(() => {
    if (apiKey) {
      fetchAvailableModels(apiKey, setListOfModels).catch(console.error);
    }
  }, [isLoading, apiKey]);

  return (
    <Canvas ctx={ctx}>
      <div className={s.form}>
        {/* Text input for the OpenAI API key */}
        <TextField
          required
          name="openAIAPIKey"
          id="openAIAPIKey"
          label="OpenAI API Key"
          value={apiKey}
          onChange={(newValue) => setApiKey(newValue)}
        />

        {/* Dropdown for selecting the GPT model from the available models fetched */}
        <div className={s.modelSelect}>
          <span>GPT Model:</span>
          <Dropdown
            renderTrigger={({ open, onClick }) => (
              <Button
                onClick={onClick}
                rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
              >
                {gptModel}
              </Button>
            )}
          >
            <DropdownMenu>
              {listOfModels.length === 1 && (
                <DropdownOption>Insert a valid OpenAI API Key</DropdownOption>
              )}
              {listOfModels
                .filter((model) => model.includes('gpt'))
                .map((model) => {
                  return (
                    <DropdownOption
                      onClick={() => {
                        setGptModel(model);
                      }}
                      key={model}
                    >
                      {model}
                    </DropdownOption>
                  );
                })}
            </DropdownMenu>
          </Dropdown>
          <span className={s.tooltipConfig}>
            Using gpt-4o-mini is recommended
          </span>
        </div>

        {/* Dropdown for selecting the Dall-E model for image generation */}
        <div className={s.modelSelect}>
          <span>Dall-E Model:</span>
          <Dropdown
            renderTrigger={({ open, onClick }) => (
              <Button
                onClick={onClick}
                rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
              >
                {dallEModel}
              </Button>
            )}
          >
            <DropdownMenu>
              {listOfModels.length === 1 && (
                <DropdownOption>Insert a valid OpenAI API Key</DropdownOption>
              )}
              {listOfModels
                .filter((model) => model.includes('dall-e'))
                .map((model) => {
                  return (
                    <DropdownOption
                      onClick={() => {
                        setDallEModel(model);
                      }}
                      key={model}
                    >
                      {model}
                    </DropdownOption>
                  );
                })}
            </DropdownMenu>
          </Dropdown>
          <span className={s.tooltipConfig}>Using dall-e-3 is recommended</span>
        </div>
      </div>

      <div className={s.buttons}>
        {/* Button to save the chosen API key and models */}
        <Button
          disabled={isLoading}
          fullWidth
          buttonType="primary"
          onClick={() =>
            saveApiKey(ctx, apiKey, gptModel, dallEModel, setIsLoading)
          }
        >
          {isLoading ? 'Saving...' : 'Save'}{' '}
          {isLoading && <Spinner size={24} />}
        </Button>

        {/* Button to navigate to advanced options */}
        <Button
          disabled={isLoading}
          fullWidth
          onClick={() => {
            ctx.navigateTo(
              `/configuration/p/${ctx.plugin.id}/pages/datogpt-advanced-settings`
            );
          }}
        >
          Advanced Options
        </Button>
      </div>
    </Canvas>
  );
}
