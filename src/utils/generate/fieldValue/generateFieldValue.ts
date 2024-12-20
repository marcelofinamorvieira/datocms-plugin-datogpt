//********************************************************************************************
// generateFieldValue.ts
//
// This file exports the generateFieldValue function, which orchestrates the generation or improvement
// of a field's value using OpenAI. It delegates logic to specialized helper functions depending on
// the field type (file, gallery, structured_text, rich_text, or default fields).
//
// Key points:
// - The function receives various parameters including plugin config, current locale, DatoCMS API token, etc.
// - Depending on the fieldType, it calls helper functions like handleFileField, handleGalleryField,
//   handleStructuredTextField, handleRichTextBlock, or handleDefaultField.
// - Added an optional onStepUpdate callback that, if provided, will be called with step-by-step
//   status messages (especially useful for structured_text fields).
//
// The returned value from generateFieldValue is the final, generated or improved field value suitable for the CMS.
//
//********************************************************************************************

import OpenAI from 'openai';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import { ItemType } from 'datocms-plugin-sdk';
import { availableResolutions } from '../asset/generateUploadOnPrompt';

import { handleFileField } from './helpers/handleFileField';
import { handleGalleryField } from './helpers/handleGalleryField';
import { handleStructuredTextField } from './helpers/handleStructuredTextField';
import { handleRichTextBlock } from './helpers/handleRichTextBlock';
import { handleDefaultField } from './helpers/handleDefaultField';

type OnStepUpdateCallback = (message: string) => void;

/**
 * generateFieldValue
 * ------------------
 * Delegates field-specific logic to helper functions based on fieldType.
 *
 * Parameters:
 * - blockLevel: current block recursion depth
 * - itemTypes: dictionary of item types available
 * - prompt: user-provided prompt or instructions
 * - fieldType: the editor type of the current field
 * - pluginParams: configuration parameters
 * - locale: current locale
 * - datoKey: DatoCMS API token
 * - selectedResolution: resolution for image generation if applicable
 * - currentFieldValue: the field's current value
 * - alert: function to display messages in the CMS UI
 * - isImprove: boolean indicating if we are improving an existing value rather than generating a new one
 * - fieldInfo: info about the current field (name, apiKey, validators, hint)
 * - formValues: current record's form values
 * - blockInfo: info about the current block if field is part of a rich_text block with modular content
 * - parentBlockInfo: info about the parent block if nested
 * - fieldsetInfo: info about the fieldset that this field might belong to
 * - modelName: name of the model this field belongs to
 * - onStepUpdate: optional callback to receive step-by-step status messages
 *
 * Returns: a Promise resolving to the generated/improved field value.
 */
const generateFieldValue = async (
  blockLevel: number,
  itemTypes: Partial<Record<string, ItemType>>,
  prompt: string,
  fieldType: string,
  pluginParams: ctxParamsType,
  locale: string,
  datoKey: string,
  selectedResolution: availableResolutions,
  currentFieldValue: unknown,
  alert: (message: string) => Promise<void>,
  isImprove: boolean,
  fieldInfo: {
    name: string;
    apiKey: string;
    validatiors: string | null;
    hint: string | null;
  },
  formValues: Record<string, unknown>,
  blockInfo: {
    name: string;
    apiKey: string;
    blockModelId: string;
    availableBlocks: string[];
  } | null,
  parentBlockInfo: {
    name: string;
    apiKey: string;
    generatedFields: Record<string, unknown>;
  } | null,
  fieldsetInfo: {
    name: string | null;
    hint: string | null;
  } | null,
  modelName: string,
  onStepUpdate?: OnStepUpdateCallback
): Promise<unknown> => {
  const openai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  // Handle file fields
  if (fieldType === 'file') {
    return await handleFileField(
      blockLevel,
      itemTypes,
      prompt,
      fieldType,
      pluginParams,
      locale,
      datoKey,
      selectedResolution,
      currentFieldValue,
      alert,
      isImprove,
      fieldInfo,
      formValues,
      blockInfo,
      parentBlockInfo,
      fieldsetInfo,
      modelName,
      openai
    );
  }

  // Handle gallery fields
  if (fieldType === 'gallery') {
    return await handleGalleryField(
      blockLevel,
      itemTypes,
      prompt,
      fieldType,
      pluginParams,
      locale,
      datoKey,
      selectedResolution,
      currentFieldValue,
      alert,
      isImprove,
      fieldInfo,
      formValues,
      blockInfo,
      parentBlockInfo,
      fieldsetInfo,
      modelName,
      openai
    );
  }

  // Handle structured_text fields
  if (fieldType === 'structured_text') {
    return await handleStructuredTextField(
      blockLevel,
      itemTypes,
      prompt,
      pluginParams,
      locale,
      datoKey,
      selectedResolution,
      currentFieldValue,
      alert,
      isImprove,
      fieldInfo,
      formValues,
      fieldsetInfo,
      modelName,
      openai,
      onStepUpdate
    );
  }

  // Handle rich_text fields (modular content)
  if (blockInfo) {
    return await handleRichTextBlock(
      blockLevel,
      itemTypes,
      prompt,
      fieldType,
      pluginParams,
      locale,
      datoKey,
      selectedResolution,
      currentFieldValue,
      alert,
      isImprove,
      fieldInfo,
      formValues,
      blockInfo,
      parentBlockInfo,
      fieldsetInfo,
      modelName,
      openai
    );
  }

  // Default field types (single_line, markdown, wysiwyg, etc.)
  return await handleDefaultField(
    blockLevel,
    itemTypes,
    prompt,
    fieldType,
    pluginParams,
    locale,
    datoKey,
    selectedResolution,
    currentFieldValue,
    alert,
    isImprove,
    fieldInfo,
    formValues,
    parentBlockInfo,
    fieldsetInfo,
    modelName,
    openai
  );
};

export default generateFieldValue;