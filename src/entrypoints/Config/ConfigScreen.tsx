//********************************************************************************************
// ConfigScreen.tsx
//
// This file provides the main configuration screen for the plugin, allowing users to
// input their OpenAI API key and select the desired GPT and Dall-E models. It also provides
// navigation to advanced options pages.
//
// The component:
// - Fetches and displays available OpenAI models after the user provides a valid API key.
// - Saves the chosen API key and models into the plugin parameters.
// - Uses a button to navigate to the advanced settings page.
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

// Type definition for field prompts is reused from here:
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

// AdvancedSettings type represents all advanced settings, defined elsewhere:
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
};

// ctxParamsType represents the plugin parameters including API keys and model choices:
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

// saveApiKey updates the plugin parameters with the provided API key and models:
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
          translationFields: Object.keys(fieldPrompt), // defaults
          generateValueFields: Object.keys(fieldPrompt), // defaults
          improveValueFields: Object.keys(fieldPrompt), // defaults
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

// fetchAvailableModels retrieves a list of available models from OpenAI:
async function fetchAvailableModels(
  apiKey: string,
  setOptions: React.Dispatch<React.SetStateAction<string[]>>
) {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const list = await openai.models.list();
  setOptions(list.data.map((option) => option.id));
}

// The ConfigScreen component:
// - Renders a form to input OpenAI API key
// - Shows dropdowns for GPT and Dall-E model selection
// - Provides a button to navigate to advanced settings
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

  // On changes to API key or loading state, attempt to fetch available models:
  useEffect(() => {
    if (apiKey) {
      fetchAvailableModels(apiKey, setListOfModels).catch(console.error);
    }
  }, [isLoading, apiKey]);

  return (
    <Canvas ctx={ctx}>
      <div className={s.form}>
        {/* Input field for OpenAI API Key */}
        <TextField
          required
          name="openAIAPIKey"
          id="openAIAPIKey"
          label="OpenAI API Key"
          value={apiKey}
          onChange={(newValue) => setApiKey(newValue)}
        />

        {/* Model selection for GPT model */}
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

        {/* Model selection for Dall-E model */}
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
        {/* Button to save API key and model selections */}
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

        {/* Button to go to advanced settings */}
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
