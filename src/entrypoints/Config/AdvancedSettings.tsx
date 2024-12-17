//********************************************************************************************
// AdvancedSettings.tsx
//
// This file provides a page for configuring advanced plugin settings. It includes a variety
// of toggles and multi-select fields controlling how the plugin behaves. For example:
// - Which fields can have values generated or improved.
// - Which fields can be translated.
// - Media generation permissions.
// - Block generation depth.
//
// The page reads and writes these settings to the plugin parameters so they persist.
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
// Field types definitions for labeling
//-------------------------------------------

// textFieldTypes: Maps internal field editor keys to human-readable labels.
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

// translateFieldTypes: Similar map but for fields that can be translated.
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

// saveApiKey:
// Updates the plugin parameters with the current advanced settings.
// On completion, shows a toast message confirming the save.
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

// PropTypes for AdvancedSettings component:
// ctx: RenderPageCtx for interacting with the plugin configuration page.
type PropTypes = {
  ctx: RenderPageCtx;
};

// AdvancedSettings Component:
// Renders a page allowing the user to configure advanced plugin behavior.
// It loads current advanced settings from plugin parameters, displays them as form fields,
// and lets the user modify them. On saving, updates the plugin parameters.
//
// Sections included:
// - Generation Settings
// - Value Improvement Settings
// - Translation Settings
// - Media Settings
// - Block Generation Settings
//
// Newly added: A toggle in media settings for `seoGenerateAsset`.
export default function AdvancedSettings({ ctx }: PropTypes) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;
  const [cureentAdvancedSettings, setAdvancedSettings] = useState(
    pluginParams.advancedSettings
  );
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Canvas ctx={ctx}>
      <div className={s.configContainer}>
        {/* Generation Settings Section:
           Controls which fields can have the 'Generate value' option. */}
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
           Controls which fields have the 'Improve current value' option. */}
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
           Controls if the whole record can be translated and which fields have translation option. */}
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
           Controls permissions for generating assets in media area, fields, alt generation, etc.
           Now also includes the new seoGenerateAsset toggle. */}
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

          {/* New Toggle: seoGenerateAsset */}
          <SwitchField
            name="seoGenerateAsset"
            id="seoGenerateAsset"
            label="Generate new asset when generating an seo value?"
            value={cureentAdvancedSettings.seoGenerateAsset}
            onChange={(newValue) =>
              setAdvancedSettings({
                ...cureentAdvancedSettings,
                seoGenerateAsset: newValue,
              })
            }
          />
        </SettingsSection>

        {/* Block Generation Settings Section:
           Controls how nested block generation and asset generation in blocks are handled. */}
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

        {/* Button to save changes to advanced settings */}
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
