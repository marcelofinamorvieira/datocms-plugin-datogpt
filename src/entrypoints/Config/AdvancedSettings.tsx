//********************************************************************************************
// AdvancedSettings.tsx
//
// This file provides a page for advanced plugin configuration options.
// It allows toggling various features like media area permissions, translation fields,
// block generation depth, and specifying which fields support generation or improvement.
//
// This component:
// - Reads current advanced settings from plugin parameters.
// - Renders various switches and dropdowns to configure these settings.
// - Uses helper components SettingsSection and DropdownSetting for cleaner UI layout.
// - Persists changes when the "Save" button is clicked.
//********************************************************************************************

import { RenderPageCtx } from 'datocms-plugin-sdk';
import {
  Button,
  Canvas,
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
import { SettingsSection } from './components/SettingsSection';
import { DropdownSetting } from './components/DropdownSetting';

// Field type objects for labeling:
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
};

// saveApiKey updates the plugin's advanced settings:
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

type PropTypes = {
  ctx: RenderPageCtx;
};

// The AdvancedSettings component:
// - Loads current advanced settings from plugin parameters
// - Renders form fields (switches, multiple selects) to update them
// - Allows saving changes to plugin parameters
export default function AdvancedSettings({ ctx }: PropTypes) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;
  const [cureentAdvancedSettings, setAdvancedSettings] = useState(
    pluginParams.advancedSettings
  );
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Canvas ctx={ctx}>
      <div className={s.configContainer}>
        {/* Section for fields that can have generated values */}
        <SettingsSection title="Generation Settings">
          <SelectField
            name="generateValueFields"
            id="generateValueFields"
            label="Fields with the 'Generate value' option"
            value={cureentAdvancedSettings.generateValueFields.map((field) => ({
              label: textFieldTypes[field as keyof typeof textFieldTypes],
              value: field,
            }))}
            selectInputProps={{
              isMulti: true,
              options: Object.entries(textFieldTypes).map(([value, label]) => ({
                label,
                value,
              })),
            }}
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                generateValueFields: newValue.map((v) => v.value),
              })
            }
          />
        </SettingsSection>

        {/* Section for fields that can be improved */}
        <SettingsSection title="Value Improvement Settings">
          <SelectField
            name="improveValueFields"
            id="improveValueFields"
            label="Fields with the 'Improve current value' option"
            value={cureentAdvancedSettings.improveValueFields.map((field) => ({
              label: textFieldTypes[field as keyof typeof textFieldTypes],
              value: field,
            }))}
            selectInputProps={{
              isMulti: true,
              options: Object.entries(textFieldTypes).map(([value, label]) => ({
                label,
                value,
              })),
            }}
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                improveValueFields: newValue.map((v) => v.value),
              })
            }
          />
        </SettingsSection>

        {/* Section for translation settings */}
        <SettingsSection title="Translation Settings">
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
                  value,
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
        </SettingsSection>

        {/* Section for media settings */}
        <SettingsSection title="Media Settings">
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
        </SettingsSection>

        {/* Section for block generation settings */}
        <SettingsSection title="Block Generation Settings">
          <DropdownSetting
            label="Max depth of nested block generation"
            selectedValue={String(cureentAdvancedSettings.blockGenerateDepth)}
            options={['1', '2', '3', '4', '5']}
            onSelect={(val) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                blockGenerateDepth: Number(val),
              })
            }
          />

          <DropdownSetting
            label="For asset fields inside blocks being generated"
            selectedValue={
              cureentAdvancedSettings.blockAssetsGeneration === 'null'
                ? 'Leave it empty'
                : 'Generate new asset'
            }
            options={['Generate new asset', 'Leave it empty']}
            onSelect={(val) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                blockAssetsGeneration:
                  val === 'Generate new asset' ? 'generate' : 'null',
              })
            }
          />
        </SettingsSection>

        {/* Save button */}
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
