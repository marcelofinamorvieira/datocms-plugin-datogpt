//********************************************************************************************
// ConfigScreen.tsx
//
// This file provides the main configuration screen for the plugin, allowing users to
// input their OpenAI API key, select GPT and Dall-E models, and navigate to advanced settings.
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

// FieldPrompts: A mapping from field editor types to their respective prompts.
// Each field type corresponds to a prompt that guides the model on how to format data.
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

// AdvancedSettings: Configuration object controlling plugin features.
// The newly added `generateAssetsOnSidebarBulkGeneration` determines if assets can be generated
// during the "Generate all fields" action from the sidebar.
export type AdvancedSettings = {
  mediaAreaPermissions: boolean;
  translateWholeRecord: boolean;
  generateAlts: boolean;
  mediaFieldsPermissions: boolean;
  blockGenerateDepth: number;
  blockAssetsGeneration: 'null' | 'generate';
  translationFields: string[];
  generateValueFields: string[];
  improveValueFields: string[];
  seoGenerateAsset: boolean;
  generateAssetsOnSidebarBulkGeneration: boolean; 
};

// ctxParamsType: The main plugin parameters object stored by DatoCMS.
// Includes API keys, model choices, prompts, and advanced settings.
export type ctxParamsType = {
  apiKey: string;
  gptModel: string;
  dallEModel: string;
  prompts: {
    basePrompt: string;
    altGenerationPrompt: string;
    fieldPrompts: FieldPrompts;
  };
  advancedSettings: AdvancedSettings;
};

// saveApiKey: Persists the API key, selected models, and ensures prompt/advanced settings are stored.
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
          generateAssetsOnSidebarBulkGeneration: false,
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

// fetchAvailableModels: Fetches available models from OpenAI using the given API key.
async function fetchAvailableModels(
  apiKey: string,
  setOptions: React.Dispatch<React.SetStateAction<string[]>>
) {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const list = await openai.models.list();
  setOptions(list.data.map((option) => option.id));
}

// ConfigScreen component:
// - Allows the user to configure the OpenAI API key and models.
// - Provides a button to advanced options where the new toggle can be found.
export default function ConfigScreen({ ctx }: { ctx: RenderConfigScreenCtx }) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  const [apiKey, setApiKey] = useState(pluginParams.apiKey ?? '');
  const [listOfModels, setListOfModels] = useState([
    'Insert a valid OpenAI API Key',
  ]);
  const [gptModel, setGptModel] = useState(pluginParams.gptModel ?? 'None');
  const [dallEModel, setDallEModel] = useState(pluginParams.dallEModel ?? 'None');
  const [isLoading, setIsLoading] = useState(false);

  // Whenever the API key or loading state changes, try to fetch models again if a valid key is provided.
  useEffect(() => {
    if (apiKey) {
      fetchAvailableModels(apiKey, setListOfModels).catch(console.error);
    }
  }, [isLoading, apiKey]);

  return (
    <Canvas ctx={ctx}>
      <div className={s.form}>
        {/* Text input for API Key */}
        <TextField
          required
          name="openAIAPIKey"
          id="openAIAPIKey"
          label="OpenAI API Key"
          value={apiKey}
          onChange={(newValue) => setApiKey(newValue)}
        />

        {/* Dropdown for GPT model selection */}
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

        {/* Dropdown for Dall-E model selection */}
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
        {/* Button to save the API Key and model selections */}
        <Button
          disabled={isLoading}
          fullWidth
          buttonType="primary"
          onClick={() => saveApiKey(ctx, apiKey, gptModel, dallEModel, setIsLoading)}
        >
          {isLoading ? 'Saving...' : 'Save'}{' '}
          {isLoading && <Spinner size={24} />}
        </Button>

        {/* Button to navigate to advanced settings (where the new toggle is located) */}
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