//********************************************************************************************
// AdvancedSettings.tsx
//
// This file renders a configuration page for advanced plugin settings. It provides toggles
// and multi-select options to customize plugin behavior, including generation, improvement,
// translation, and media-related functionalities.
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

//-------------------------------------------
// Mapping objects for field types:
// These maps help provide human-readable labels for each field type in the UI.
//-------------------------------------------
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

//-------------------------------------------
// saveApiKey:
// Saves the updated advanced settings into the plugin parameters. Displays a notice when done.
//-------------------------------------------
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

//-------------------------------------------
// PropTypes for the AdvancedSettings component:
//
// ctx: Provides context for the configuration page, allowing navigation and parameter updates.
//-------------------------------------------
type PropTypes = {
  ctx: RenderPageCtx;
};

//-------------------------------------------
// AdvancedSettings Component:
//
// This component displays several sections of settings. Each section groups related toggles
// and fields. Sections include:
// - Generation Settings
// - Value Improvement Settings
// - Translation Settings
// - Media Settings
// - Block Generation Settings
//
// Newly added in Media Settings is a toggle for `generateAssetsOnSidebarBulkGeneration`
// that controls if new assets are generated during "Generate all fields" from the sidebar.
//
// The user can modify these settings and click "Save" to persist them. The changes are stored
// in the plugin parameters for future use throughout the plugin.
//-------------------------------------------
export default function AdvancedSettings({ ctx }: PropTypes) {
  // Retrieve current plugin parameters and parse them into `cureentAdvancedSettings`.
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  // Initialize local state with the existing advanced settings.
  const [cureentAdvancedSettings, setAdvancedSettings] = useState(
    pluginParams.advancedSettings
  );

  // isLoading: Manages the loading state when saving changes.
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Canvas ctx={ctx}>
      <div className={s.configContainer}>
        {/* Generation Settings Section:
           Controls which fields have a 'Generate value' button. */}
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

        {/* Value Improvement Settings Section:
           Controls which fields allow improving existing values. */}
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

        {/* Translation Settings Section:
           Controls translation features, including translating the whole record and specific fields. */}
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

        {/* Media Settings Section:
           Controls various asset-related functionalities, including alt generation */}
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

          <SwitchField
            name="seoGenerateAsset"
            id="seoGenerateAsset"
            label="Generate new asset when generating an SEO value"
            value={cureentAdvancedSettings.seoGenerateAsset}
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                seoGenerateAsset: newValue,
              })
            }
          />

          <SwitchField
            name="generateAssetsOnSidebarBulkGeneration"
            id="generateAssetsOnSidebarBulkGeneration"
            label="Generate new assets when generating all field values from sidebar"
            value={
              cureentAdvancedSettings.generateAssetsOnSidebarBulkGeneration
            }
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                generateAssetsOnSidebarBulkGeneration: newValue,
              })
            }
          />
        </SettingsSection>

        {/* Block Generation Settings Section:
           Controls nested block generation depth and asset generation within blocks. */}
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

        {/* Save Button:
           Commits the changes to advanced settings. */}
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
