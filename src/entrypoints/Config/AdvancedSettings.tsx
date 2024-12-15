import { RenderPageCtx } from 'datocms-plugin-sdk';
import {
  Button,
  Canvas,
  CaretDownIcon,
  CaretUpIcon,
  Dropdown,
  DropdownMenu,
  DropdownOption,
  SelectField,
  Spinner,
  SwitchField,
} from 'datocms-react-ui';
import s from '../styles.module.css';
import { useState } from 'react';
import {
  AdvancedSettings as AdvancedSettingsType,
  ctxParamsType,
} from './ConfigScreen';

type PropTypes = {
  ctx: RenderPageCtx;
};

async function saveApiKey(
  ctx: RenderPageCtx,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  currentParams: ctxParamsType,
  advancedSettings: AdvancedSettingsType
) {
  setIsLoading(true);
  await ctx.updatePluginParameters({
    ...currentParams,
    advancedSettings: advancedSettings,
  });
  setIsLoading(false);
  ctx.customToast({
    type: 'notice',
    message: 'Prompts saved!',
    dismissOnPageChange: true,
    dismissAfterTimeout: 5000,
  });
}

export const textFieldTypes = {
  single_line: 'Singe line string',
  markdown: 'Markdown',
  wysiwyg: 'HTML Editor',
  date_picker: 'Date Picker',
  date_time_picker: 'Date Time Picker',
  integer: 'Integer',
  float: 'Float',
  boolean: 'Boolean',
  map: 'Map',
  color_picker: 'Color Picker',
  slug: 'Slug',
  json: 'JSON',
  seo: 'SEO',
  textarea: 'Textarea',
  structured_text: 'Structured Text',
};

export const translateFieldTypes = {
  single_line: 'Singe line string',
  markdown: 'Markdown',
  wysiwyg: 'HTML Editor',
  textarea: 'Textarea',
  slug: 'Slug',
  json: 'JSON',
  seo: 'SEO',
  structured_text: 'Structured Text',
  //we need to add modular content here
};

export default function AdvancedSettings({ ctx }: PropTypes) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;
  const [cureentAdvancedSettings, setAdvancedSettings] = useState(
    pluginParams.advancedSettings
  );
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Canvas ctx={ctx}>
      <div className={s.configContainer}>
        <div>
          <h2>Generation Settings</h2>
          <div>
            <SelectField
              name="generateValueFields"
              id="generateValueFields"
              label="Fields with the 'Generate value' option"
              value={cureentAdvancedSettings.generateValueFields.map(
                (field) => ({
                  label: textFieldTypes[field as keyof typeof textFieldTypes],
                  value: field,
                })
              )}
              selectInputProps={{
                isMulti: true,
                options: Object.entries(textFieldTypes).map(
                  ([value, label]) => ({
                    label,
                    value: value as keyof typeof textFieldTypes,
                  })
                ),
              }}
              onChange={(newValue) =>
                setAdvancedSettings({
                  ...cureentAdvancedSettings,
                  generateValueFields: newValue.map((v) => v.value),
                })
              }
            />
          </div>
        </div>
        <div>
          <h2>Value Improvement Settings</h2>
          <div>
            <SelectField
              name="improveValueFields"
              id="improveValueFields"
              label="Fields with the 'Improve current value' option"
              value={cureentAdvancedSettings.improveValueFields.map(
                (field) => ({
                  label: textFieldTypes[field as keyof typeof textFieldTypes],
                  value: field,
                })
              )}
              selectInputProps={{
                isMulti: true,
                options: Object.entries(textFieldTypes).map(
                  ([value, label]) => ({
                    label,
                    value: value as keyof typeof textFieldTypes,
                  })
                ),
              }}
              onChange={(newValue) =>
                setAdvancedSettings({
                  ...cureentAdvancedSettings,
                  improveValueFields: newValue.map((v) => v.value),
                })
              }
            />
          </div>
        </div>
        <div>
          <h2>Translation Settings</h2>
        </div>
        <div>
          <SwitchField
            name="translateWholeRecord"
            id="translateWholeRecord"
            label="Allow translation of the whole record from the sidebar"
            value={cureentAdvancedSettings.translateWholeRecord}
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                translateWholeRecord: newValue,
              })
            }
          />
        </div>

        <div>
          <SelectField
            name="fieldsWithTranslationOption"
            id="fieldsWithTranslationOption"
            label="Fields with the 'Translate' option"
            value={cureentAdvancedSettings.translationFields.map((field) => ({
              label: textFieldTypes[field as keyof typeof translateFieldTypes],
              value: field,
            }))}
            selectInputProps={{
              isMulti: true,
              options: Object.entries(translateFieldTypes).map(
                ([value, label]) => ({
                  label,
                  value: value as keyof typeof translateFieldTypes,
                })
              ),
            }}
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                translationFields: newValue.map((v) => v.value),
              })
            }
          />
        </div>

        <div>
          <h2>Media Settings</h2>
        </div>
        <div>
          <SwitchField
            name="mediaAreaPermissions"
            id="mediaAreaPermissions"
            label="Allow generation of assets in the media area"
            value={cureentAdvancedSettings.mediaAreaPermissions}
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                mediaAreaPermissions: newValue,
              })
            }
          />
        </div>
        <div>
          <SwitchField
            name="mediaFieldsPermissions"
            id="mediaFieldsPermissions"
            label="Allow generation of assets in media fields"
            value={cureentAdvancedSettings.mediaFieldsPermissions}
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                mediaFieldsPermissions: newValue,
              })
            }
          />
        </div>
        <div>
          <SwitchField
            name="generateAlts"
            id="generateAlts"
            label="Allow generation of alt texts for assets"
            value={cureentAdvancedSettings.generateAlts}
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                generateAlts: newValue,
              })
            }
          />
        </div>

        <div>
          <h2>Block Generation Settings</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Dropdown
              renderTrigger={({ open, onClick }) => (
                <Button
                  onClick={onClick}
                  rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
                >
                  {cureentAdvancedSettings.blockGenerateDepth}
                </Button>
              )}
            >
              <DropdownMenu>
                {[1, 2, 3, 4, 5].map((depth) => (
                  <DropdownOption
                    key={depth}
                    onClick={() =>
                      setAdvancedSettings({
                        ...cureentAdvancedSettings,
                        blockGenerateDepth: depth,
                      })
                    }
                  >
                    {depth}
                  </DropdownOption>
                ))}
              </DropdownMenu>
            </Dropdown>
            <div>Max depth of nested block generation</div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Dropdown
              renderTrigger={({ open, onClick }) => (
                <Button
                  onClick={onClick}
                  rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
                >
                  {cureentAdvancedSettings.blockAssetsGeneration === 'null'
                    ? 'Leave it empty'
                    : cureentAdvancedSettings.blockAssetsGeneration ===
                      'generate'
                    ? 'Generate new asset'
                    : 'Find best match in the media area'}
                </Button>
              )}
            >
              <DropdownMenu>
                <DropdownOption
                  onClick={() =>
                    setAdvancedSettings({
                      ...cureentAdvancedSettings,
                      blockAssetsGeneration: 'generate',
                    })
                  }
                >
                  Generate new asset
                </DropdownOption>
                <DropdownOption
                  onClick={() =>
                    setAdvancedSettings({
                      ...cureentAdvancedSettings,
                      blockAssetsGeneration: 'null',
                    })
                  }
                >
                  Leave it empty
                </DropdownOption>
              </DropdownMenu>
            </Dropdown>
            <div>For asset fields inside blocks being generated</div>
          </div>
        </div>

        <Button
          disabled={isLoading}
          fullWidth
          buttonType="primary"
          onClick={() => {
            saveApiKey(
              ctx,
              setIsLoading,
              pluginParams,
              cureentAdvancedSettings
            );
          }}
        >
          {isLoading ? 'Saving...' : 'Save'}{' '}
          {isLoading && <Spinner size={24} />}
        </Button>
      </div>
    </Canvas>
  );
}
