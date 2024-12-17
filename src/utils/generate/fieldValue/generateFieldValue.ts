//********************************************************************************************
// generateFieldValue.ts
//
//********************************************************************************************

import OpenAI from 'openai';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import { ItemType } from 'datocms-plugin-sdk';
import { availableResolutions } from '../asset/generateUploadOnPrompt';

// Import helpers for each field type:
import { handleFileField } from './helpers/handleFileField';
import { handleGalleryField } from './helpers/handleGalleryField';
import { handleStructuredTextField } from './helpers/handleStructuredTextField';
import { handleRichTextBlock } from './helpers/handleRichTextBlock';
import { handleDefaultField } from './helpers/handleDefaultField';

/**
 * generateFieldValue
 * ------------------
 * Delegates field-specific logic to helper functions.
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
  modelName: string
) => {
  const openai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  // If localized, get current locale value
  let fieldValue = currentFieldValue;
  if (
    fieldValue &&
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    (fieldValue as Record<string, unknown>)[locale]
  ) {
    fieldValue = (fieldValue as Record<string, unknown>)[locale];
  }

  // Branch by field type:

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
      fieldValue,
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
      fieldValue,
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
      fieldValue,
      alert,
      isImprove,
      fieldInfo,
      formValues,
      fieldsetInfo,
      modelName,
      openai
    );
  }

  // Handle rich_text blocks
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
      fieldValue,
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

  // Handle all other fields (default)
  return await handleDefaultField(
    blockLevel,
    itemTypes,
    prompt,
    fieldType,
    pluginParams,
    locale,
    datoKey,
    selectedResolution,
    fieldValue,
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
