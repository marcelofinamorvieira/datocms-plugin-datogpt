//********************************************************************************************
// DatoGPTSidebar.tsx
//
// This file defines a sidebar panel within DatoCMS that allows users to generate or improve
// all fields of a record at once using AI. Users can provide a prompt and trigger generation,
// or improvement, of all fields.
//********************************************************************************************

import { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Button, Canvas, Spinner } from 'datocms-react-ui';
import { useState } from 'react';
import { ctxParamsType } from '../Config/ConfigScreen';
import { motion, AnimatePresence } from 'framer-motion';
import ReactTextareaAutosize from 'react-textarea-autosize';
import s from '../styles.module.css';
import generateFieldValue from '../../utils/generate/fieldValue/generateFieldValue';
import { EditorType } from '../../types/editorTypes';

//-------------------------------------------
// Internal helper component: PromptInputArea
//
// This component renders a textarea where the user can input prompts for generating or improving all fields.
// It uses ReactTextareaAutosize to dynamically grow as the user types.
//-------------------------------------------
function PromptInputArea({
  prompts,
  setPrompts,
}: {
  prompts: string;
  setPrompts: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <ReactTextareaAutosize
      value={prompts}
      onChange={(e) => setPrompts(e.target.value)}
      name="prompts"
      id="prompts"
      placeholder="Prompt all fields"
      className={s.promptsTextarea}
    />
  );
}

//-------------------------------------------
// Internal helper component: GenerateButtons
//
// This component shows two buttons:
// - "Generate all fields" to create new values based on the prompt.
// - "Improve all fields" to improve existing values.
//
// If an operation is in progress (isLoading = true), it disables the buttons and updates the label.
//-------------------------------------------
function GenerateButtons({
  handleGenerateAll,
  handleImproveAll,
  isLoading,
}: {
  handleGenerateAll: () => void;
  handleImproveAll: () => void;
  isLoading: boolean;
}) {
  return (
    <>
      <Button fullWidth onClick={handleGenerateAll} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate all fields'}
      </Button>

      <Button fullWidth onClick={handleImproveAll} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Improve all fields'}
      </Button>
    </>
  );
}

//-------------------------------------------
// Async function: generateAllFields
//
// Given a prompt and plugin parameters, this function generates or improves all applicable fields.
// It iterates over all fields in the record, determines if they should be processed based on
// pluginParams and advanced settings, and uses generateFieldValue for each field.
//
// If the advanced setting `generateAssetsOnSidebarBulkGeneration` is false, we will temporarily
// force `seoGenerateAsset` to false to prevent asset generation.
//
// Parameters:
// - ctx: The DatoCMS RenderItemFormSidebarPanelCtx, providing access to fields, form values, and methods.
// - pluginParams: Current plugin parameters, including advanced settings.
// - prompt: The user-provided prompt.
// - isImprove: If true, improves existing values rather than generating new ones.
//
// Steps:
// 1. Sort fields by position for consistent iteration.
// 2. For each field, check if it should be generated/improved.
// 3. Generate or improve using generateFieldValue.
// 4. Update field values in the CMS form.
//
// Returns: A promise that resolves when all fields have been processed.
//-------------------------------------------
async function generateAllFields(
  ctx: RenderItemFormSidebarPanelCtx,
  pluginParams: ctxParamsType,
  prompt: string,
  isImprove: boolean
) {
  // Make a shallow copy of pluginParams to avoid mutating original object.
  const modifiedPluginParams = { ...pluginParams };

  // If the toggle `generateAssetsOnSidebarBulkGeneration` is false, disable `seoGenerateAsset` temporarily.
  if (
    !modifiedPluginParams.advancedSettings.generateAssetsOnSidebarBulkGeneration
  ) {
    modifiedPluginParams.advancedSettings.seoGenerateAsset = false;
  }

  // Sort fields by their position for predictable operation order.
  const fieldsObject = Object.entries(ctx.fields)
    .sort((a, b) => a[1]!.attributes.position - b[1]!.attributes.position)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const currentFormValues = ctx.formValues;

  // Loop over each field:
  for (const field in fieldsObject) {
    const fieldType = ctx.fields[field]!.attributes.appearance.editor;
    const fieldValue = ctx.formValues[ctx.fields[field]!.attributes.api_key];

    // Determine if this field should have generation/improvement applied.
    const shouldProcess =
      modifiedPluginParams.advancedSettings.generateValueFields.includes(
        fieldType as EditorType
      ) ||
      ((fieldType === 'gallery' || fieldType === 'file') &&
        modifiedPluginParams.advancedSettings
          .generateAssetsOnSidebarBulkGeneration);

    // If not configured to process this field, skip.
    if (!shouldProcess) continue;

    // Gather fieldset info if available for better contextual prompts.
    const fieldsetInfo = ctx.fields[field]!.relationships.fieldset.data?.id
      ? {
          name:
            ctx.fieldsets[ctx.fields[field]!.relationships.fieldset.data?.id]
              ?.attributes.title ?? null,
          hint:
            ctx.fieldsets[ctx.fields[field]!.relationships.fieldset.data?.id]
              ?.attributes.hint ?? null,
        }
      : null;

    // Perform the generation/improvement of this field.
    const generatedFieldValue = await generateFieldValue(
      0,
      ctx.itemTypes,
      prompt,
      fieldType,
      modifiedPluginParams,
      ctx.locale,
      ctx.currentUserAccessToken!,
      '1024x1024',
      fieldValue,
      ctx.alert,
      isImprove,
      {
        name: ctx.fields[field]!.attributes.label,
        apiKey: ctx.fields[field]!.attributes.api_key,
        validatiors: ctx.fields[field]!.attributes.validators
          ? JSON.stringify(ctx.fields[field]!.attributes.validators, null, 2)
          : null,
        hint: ctx.fields[field]!.attributes.hint
          ? JSON.stringify(ctx.fields[field]!.attributes.hint, null, 2)
          : null,
      },
      currentFormValues,
      null,
      null,
      fieldsetInfo,
      ctx.itemType.attributes.name
    );

    // Check if the field is localized to set the value appropriately.
    const fieldIsLocalized = ctx.fields[field]!.attributes.localized;
    currentFormValues[ctx.fields[field]!.attributes.api_key] = fieldIsLocalized
      ? { [ctx.locale]: generatedFieldValue }
      : generatedFieldValue;

    // Update the field in the CMS form with the generated/improved value.
    ctx.setFieldValue(
      ctx.fields[field]!.attributes.api_key,
      fieldIsLocalized
        ? { [ctx.locale]: generatedFieldValue }
        : generatedFieldValue
    );
  }
}

//-------------------------------------------
// DatoGPTSidebar Component:
//
// This is the main component for the sidebar. It:
// - Displays a textarea for prompts.
// - Offers buttons to "Generate all fields" or "Improve all fields".
// - Shows a spinner and "Generating..." message while operations are in progress.
//
// On mount, it checks if the plugin is properly configured. If the user
// triggers generation/improvement, it uses generateAllFields to process all fields.
// The new toggle `generateAssetsOnSidebarBulkGeneration` is considered in generateAllFields.
//
// State variables:
// - isLoading: Manages spinner display.
// - prompts: Stores the user's prompt.
//
// If no API key or GPT model is configured, a warning message is displayed instead of the UI.
//-------------------------------------------
function DatoGPTSidebar({ ctx }: { ctx: RenderItemFormSidebarPanelCtx }) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  // Local state for loading state and user prompt.
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prompts, setPrompts] = useState('');

  // If no API Key or GPT model is set, show a warning.
  if (!pluginParams.apiKey || !pluginParams.gptModel) {
    return <div>Please insert a valid API Key and select a GPT Model</div>;
  }

  // handleGenerateAll: Triggered when the user presses "Generate all fields".
  // Sets loading, calls generateAllFields, then resets loading.
  const handleGenerateAll = () => {
    setIsLoading(true);
    generateAllFields(ctx, pluginParams, prompts, false).then(() => {
      setIsLoading(false);
    });
  };

  // handleImproveAll: Similar to handleGenerateAll, but for improving existing values.
  const handleImproveAll = () => {
    setIsLoading(true);
    generateAllFields(ctx, pluginParams, prompts, true).then(() => {
      setIsLoading(false);
    });
  };

  // Render the UI inside the Canvas. AnimatePresence ensures smooth transitions.
  return (
    <Canvas ctx={ctx}>
      <AnimatePresence mode="wait">
        {!isLoading ? (
          // If not loading, show the input form (prompt area and buttons).
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <PromptInputArea prompts={prompts} setPrompts={setPrompts} />
            <GenerateButtons
              handleGenerateAll={handleGenerateAll}
              handleImproveAll={handleImproveAll}
              isLoading={isLoading}
            />
          </motion.div>
        ) : (
          // If loading, show a spinner and "Generating..." message.
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spinner size={48} />
            <h1
              style={{
                margin: '1rem',
                textAlign: 'center',
                color: 'gray',
              }}
            >
              Generating...
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </Canvas>
  );
}

export default DatoGPTSidebar;
