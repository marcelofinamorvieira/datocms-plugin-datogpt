import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { AnimationControls } from 'framer-motion';
import { ctxParamsType } from '../entrypoints/Config/ConfigScreen';
import OpenAI from 'openai';
import { basePrompt } from '../prompts/BasePrompt';
import locale from 'locale-codes';
import { fieldPrompt } from '../prompts/FieldPrompts';
import { buildClient } from '@datocms/cma-client-browser';

/**
 * Retrieves locale data by tag using 'locale-codes' library
 */
const localeSelect = locale.getByTag;

/**
 * Fields that do not require translation. These field types are inherently language-neutral.
 */
export const fieldsThatDontNeedTranslation = [
  'date_picker',
  'date_time_picker',
  'integer',
  'float',
  'boolean',
  'map',
  'color_picker',
  'file',
  'gallery',
  'link_select',
  'links_select',
  'video',
];

/**
 * Extracts text values from structured data. It searches through objects/arrays
 * recursively and collects all 'text' properties.
 *
 * @param data The structured object from which to extract text.
 * @returns An array of found text strings.
 */
function extractTextValues(data: unknown): string[] {
  const textValues: string[] = [];

  function traverse(obj: any) {
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else if (typeof obj === 'object' && obj !== null) {
      if (obj.text !== undefined) {
        textValues.push(obj.text);
      }
      Object.values(obj).forEach(traverse);
    }
  }

  traverse(data);
  return textValues;
}

/**
 * Removes 'id' keys from an object recursively, to ensure no unwanted IDs remain.
 *
 * @param obj The object to clean.
 * @returns A new object without 'id' fields.
 */
function removeIds(obj: unknown): any {
  if (Array.isArray(obj)) {
    return obj.map(removeIds);
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'id') {
        newObj[key] = removeIds(value);
      }
    }
    return newObj;
  }
  return obj;
}

/**
 * Reconstructs an object by replacing 'text' fields with values from a given array of strings.
 * This is used after translating the strings extracted by `extractTextValues`.
 *
 * @param originalObject The original object with text fields.
 * @param textValues The array of translated text strings.
 * @returns The reconstructed object with translated text inserted back in.
 */
function reconstructObject(originalObject: unknown, textValues: string[]): any {
  let index = 0;
  function traverse(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => traverse(item));
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj: any = {};
      for (const key in obj) {
        if (key === 'text' && index < textValues.length) {
          newObj[key] = textValues[index++];
        } else {
          newObj[key] = traverse(obj[key]);
        }
      }
      return newObj;
    }
    return obj;
  }
  return traverse(originalObject);
}

/**
 * Deletes 'itemId' keys from an object recursively, similar to removeIds but specifically targeting itemId.
 *
 * @param obj The object to clean.
 * @returns A new object without 'itemId' fields.
 */
function deleteItemIdKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deleteItemIdKeys);
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'itemId') {
        newObj[key] = deleteItemIdKeys(value);
      }
    }
    return newObj;
  }
  return obj;
}

/**
 * Inserts an object into an array at a specific index.
 *
 * @param array The original array.
 * @param object The object to insert.
 * @param index The position at which to insert the object.
 * @returns A new array with the object inserted.
 */
function insertObjectAtIndex(array: unknown[], object: unknown, index: number) {
  return [...array.slice(0, index), object, ...array.slice(index)];
}

/**
 * Translate SEO field value using OpenAI. It expects a JSON with title and description to translate.
 *
 * @param fieldValue The SEO object containing title and description.
 * @param pluginParams The plugin parameters for model configuration.
 * @param toLocale The target locale string.
 * @param openai The OpenAI client instance.
 * @param fieldTypePrompt Additional prompt instructions.
 * @returns The translated SEO object.
 */
async function translateSeoFieldValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  openai: OpenAI,
  fieldTypePrompt: string
) {
  const seoObject = fieldValue as Record<string, string>;
  const seoObjectToBeTranslated = {
    title: seoObject.title,
    description: seoObject.description,
  };

  const seoCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          (pluginParams.prompts?.basePrompt || basePrompt) +
          ' translate the following string\n' +
          JSON.stringify(seoObjectToBeTranslated) +
          ' to the language ' +
          localeSelect(toLocale).name +
          fieldTypePrompt,
      },
    ],
    model: pluginParams.gptModel,
  });

  const returnedSeoObject = JSON.parse(
    seoCompletion.choices[0].message.content!
  );
  seoObject.title = returnedSeoObject.title;
  seoObject.description = returnedSeoObject.description;
  return seoObject;
}

/**
 * Translate block values in a rich text field. This involves translating nested fields for each block.
 *
 * @param fieldValue The block value array.
 * @param pluginParams The plugin parameters.
 * @param toLocale Target locale.
 * @param openai OpenAI client.
 * @param apiToken DatoCMS API token to fetch block fields info.
 */
async function translateBlockValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  openai: OpenAI,
  apiToken: string
) {
  const cleanedFieldValue = deleteItemIdKeys(fieldValue);
  const client = buildClient({ apiToken: apiToken });

  for (const block of cleanedFieldValue as any[]) {
    // Fetch fields for each block type to determine their editor types
    const fields = await client.fields.list(
      block.itemTypeId || block.blockModelId
    );
    const fieldTypeDictionary = fields.reduce((acc, field) => {
      acc[field.api_key] = field.appearance.editor;
      return acc;
    }, {} as Record<string, string>);

    // Translate each field of the block
    for (const f in block) {
      if (
        f === 'itemTypeId' ||
        f === 'originalIndex' ||
        f === 'blockModelId' ||
        f === 'type' ||
        f === 'children'
      ) {
        continue;
      }

      let nestedFieldValuePrompt = ' Return the response in the format of ';
      nestedFieldValuePrompt += fieldTypeDictionary[f];

      block[f] = await translateFieldValue(
        block[f],
        pluginParams,
        toLocale,
        fieldTypeDictionary[f],
        openai,
        nestedFieldValuePrompt,
        apiToken
      );
    }
  }

  return cleanedFieldValue;
}

/**
 * Translates a structured text field by separating out block nodes, translating them,
 * translating inline text, and then reassembling the structure.
 *
 * @param fieldValue The structured text value.
 * @param pluginParams The plugin parameters.
 * @param toLocale Target locale.
 * @param openai OpenAI client.
 * @param apiToken DatoCMS API token.
 * @returns The fully translated structured text value.
 */
async function translateStructuredTextValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  openai: OpenAI,
  apiToken: string
) {
  const noIdFieldValue = removeIds(fieldValue);

  // Extract block nodes separately
  const blockNodes = (noIdFieldValue as Array<unknown>).reduce(
    (acc: any[], node: any, index: number) => {
      if (node.type === 'block') {
        acc.push({ ...node, originalIndex: index });
      }
      return acc;
    },
    []
  );

  // Filter out blocks to translate inline text first
  const fieldValueWithoutBlocks = (noIdFieldValue as Array<unknown>).filter(
    (node: any) => node.type !== 'block'
  );

  const textValues = extractTextValues(fieldValueWithoutBlocks);

  // Translate inline text array using OpenAI
  const structuredTextcompletion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          (pluginParams.prompts?.basePrompt || basePrompt) +
          ' translate the following string array ' +
          JSON.stringify(textValues, null, 2) +
          ' to the language ' +
          localeSelect(toLocale).name +
          ' return the translated strings array in a valid JSON format do not remove spaces or empty strings. The number of returned strings should be the same as the number of strings in the original array.',
      },
    ],
    model: pluginParams.gptModel,
  });

  const returnedTextValues = JSON.parse(
    structuredTextcompletion.choices[0].message.content!
  );

  // Translate block nodes separately
  const translatedBlockNodes = await translateFieldValue(
    blockNodes,
    pluginParams,
    toLocale,
    'rich_text',
    openai,
    '',
    apiToken
  );

  console.log({ returnedTextValues });

  // Reconstruct the object with the translated inline texts
  const reconstructedObject = reconstructObject(
    fieldValueWithoutBlocks,
    returnedTextValues
  );

  // Insert the translated block nodes back into their original positions
  let finalReconstructedObject = reconstructedObject;
  for (const node of translatedBlockNodes as any[]) {
    finalReconstructedObject = insertObjectAtIndex(
      finalReconstructedObject,
      node,
      node.originalIndex
    );
  }

  // Clean up temporary keys like 'originalIndex'
  const cleanedReconstructedObject = finalReconstructedObject.map(
    ({
      originalIndex,
      ...rest
    }: {
      originalIndex?: number;
      [key: string]: any;
    }) => rest
  );

  return cleanedReconstructedObject;
}

/**
 * Translate a default field value (string-based) using OpenAI.
 *
 * @param fieldValue The current field value (string).
 * @param pluginParams The plugin parameters.
 * @param toLocale Target locale.
 * @param openai OpenAI client.
 * @param fieldTypePrompt Additional prompt details for the model.
 */
async function translateDefaultFieldValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  openai: OpenAI,
  fieldTypePrompt: string
) {
  const prompt =
    (pluginParams.prompts?.basePrompt || basePrompt) +
    ' translate the following string\n"' +
    fieldValue +
    '"\n to the language ' +
    localeSelect(toLocale).name +
    fieldTypePrompt;

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: prompt,
      },
    ],
    model: pluginParams.gptModel,
  });

  // Remove quotes from the response if any
  return completion.choices[0].message.content?.replace(/"/g, '');
}

/**
 * Main translation function that chooses the right translation approach depending on the field type.
 *
 * @param fieldValue The current field value to translate.
 * @param pluginParams Plugin parameters for configuration.
 * @param toLocale The target locale.
 * @param fieldType The editor type of the field.
 * @param openai The OpenAI client.
 * @param fieldTypePrompt Additional prompt instructions.
 * @param apiToken DatoCMS API token.
 * @returns The translated field value.
 */
export async function translateFieldValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  fieldType: string,
  openai: OpenAI,
  fieldTypePrompt: string,
  apiToken: string
): Promise<unknown> {
  // If field doesn't need translation or is empty, return original value
  if (fieldsThatDontNeedTranslation.includes(fieldType) || !fieldValue) {
    return fieldValue;
  }

  // Handle each field type
  switch (fieldType) {
    case 'seo':
      return translateSeoFieldValue(
        fieldValue,
        pluginParams,
        toLocale,
        openai,
        fieldTypePrompt
      );
    case 'rich_text':
      return translateBlockValue(
        fieldValue,
        pluginParams,
        toLocale,
        openai,
        apiToken
      );
    case 'structured_text':
      return translateStructuredTextValue(
        fieldValue,
        pluginParams,
        toLocale,
        openai,
        apiToken
      );
    default:
      return translateDefaultFieldValue(
        fieldValue,
        pluginParams,
        toLocale,
        openai,
        fieldTypePrompt
      );
  }
}

/**
 * TranslateField main entry point:
 *
 * Given a field value and target locale, this function:
 * - Disables the original field (to prevent user editing during translation)
 * - Shows a loading animation (rotate icon)
 * - Calls translateFieldValue to get the translated version of the field
 * - Re-enables the field and stops loading
 *
 * @param setViewState State setter for the UI view state
 * @param fieldValue The current field value to translate
 * @param ctx The DatoCMS RenderFieldExtensionCtx
 * @param controls Animation controls for the spinner
 * @param pluginParams Configuration parameters
 * @param toLocale The target locale to translate into
 * @param fieldType The editor type for the field
 */
const TranslateField = async (
  setViewState: React.Dispatch<React.SetStateAction<string>>,
  fieldValue: unknown,
  ctx: RenderFieldExtensionCtx,
  controls: AnimationControls,
  pluginParams: ctxParamsType,
  toLocale: string,
  fieldType: string
) => {
  // Extract field path and adjust to target locale
  const fieldPathArray = ctx.fieldPath.split('.');
  fieldPathArray[fieldPathArray.length - 1] = toLocale;

  // UI adjustments before translation
  ctx.disableField(ctx.fieldPath, true);
  setViewState('collapsed');
  controls.start({
    rotate: [0, 360],
    transition: {
      rotate: {
        duration: 1,
        ease: 'linear',
        repeat: Infinity,
      },
    },
  });

  // Determine the field type prompt
  let fieldTypePrompt = 'Return the response in the format of ';
  const fieldPromptObject = pluginParams.prompts?.fieldPrompts.single_line
    ? pluginParams.prompts?.fieldPrompts
    : fieldPrompt;
  if (fieldType !== 'structured_text' && fieldType !== 'rich_text') {
    fieldTypePrompt += fieldPromptObject[fieldType as keyof typeof fieldPrompt];
  }

  // Create OpenAI instance
  const newOpenai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  // Perform the translation
  const translatedFieldValue = await translateFieldValue(
    fieldValue,
    pluginParams,
    toLocale,
    fieldType,
    newOpenai,
    fieldTypePrompt,
    ctx.currentUserAccessToken!
  );

  // Update the field with the translated value
  ctx.setFieldValue(fieldPathArray.join('.'), translatedFieldValue);
  ctx.disableField(ctx.fieldPath, false);
  controls.stop();
};

export default TranslateField;
