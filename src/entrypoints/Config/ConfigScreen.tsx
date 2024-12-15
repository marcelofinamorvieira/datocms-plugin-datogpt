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
import { textFieldTypes, translateFieldTypes } from './AdvancedSettings';
import { EditorType } from '../../types/editorTypes';

type Props = {
  ctx: RenderConfigScreenCtx;
};

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

export type AdvancedSettings = {
  mediaAreaPermissions: boolean;
  translateWholeRecord: boolean;
  generateAlts: boolean;
  mediaFieldsPermissions: boolean;
  blockGenerateDepth: number;
  blockAssetsGeneration: 'null' | 'generate';
  translationFields: (keyof typeof translateFieldTypes)[];
  generateValueFields: EditorType[];
  improveValueFields: (keyof typeof textFieldTypes)[];
};

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
          translationFields: Object.keys(translateFieldTypes),
          generateValueFields: Object.keys(textFieldTypes),
          improveValueFields: Object.keys(textFieldTypes),
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

async function fetchAvailableModels(
  apiKey: string,
  setOptions: React.Dispatch<React.SetStateAction<string[]>>
) {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const list = await openai.models.list();
  setOptions(list.data.map((option) => option.id));
}

export default function ConfigScreen({ ctx }: Props) {
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

  useEffect(() => {
    if (apiKey)
      fetchAvailableModels(apiKey, setListOfModels).catch(console.error);
  }, [isLoading]);

  return (
    <Canvas ctx={ctx}>
      <div className={s.form}>
        <TextField
          required
          name="openAIAPIKey"
          id="openAIAPIKey"
          label="OpenAI API Key"
          value={apiKey}
          onChange={(newValue) => setApiKey(newValue)}
        />
        {/* <p>
          You can get your OpenAI API key by going to{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank">
            https://platform.openai.com/api-keys
          </a>
        </p> */}

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
