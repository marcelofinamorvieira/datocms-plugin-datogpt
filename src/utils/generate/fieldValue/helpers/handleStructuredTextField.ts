//********************************************************************************************
// handleStructuredTextField.ts
//
// This helper function is used by generateFieldValue to handle 'structured_text' fields.
// It can either improve existing structured text or generate new structured text with blocks.
// The process involves multiple steps:
//
// Steps when isImprove = true:
// 1. Check if the field is empty or not.
// 2. Translate/improve inline text values.
// 3. If there are block nodes, translate/improve them as well.
// 4. Reassemble the final structured text with the improved strings and updated blocks.
//
// Steps when isImprove = false:
// 1. Generate a base HTML using a wysiwyg prompt.
// 2. Convert it to structured text format.
// 3. Determine which blocks to insert based on the prompt and available blocks.
// 4. Insert the chosen blocks into the structured text.
//
// We have now added onStepUpdate calls to inform the caller about what step is currently happening,
// providing more granular feedback when dealing with structured_text fields.
//
// Parameters:
// - blockLevel: recursion depth for nested blocks
// - itemTypes: map of available item types
// - prompt: user prompt
// - pluginParams: configuration parameters
// - locale: target locale
// - datoKey: DatoCMS API token
// - selectedResolution: resolution for images if needed
// - fieldValue: current field value
// - alert: function to display messages
// - isImprove: boolean indicating whether we are improving an existing value
// - fieldInfo: info about the current field
// - formValues: entire form values of the record
// - fieldsetInfo: info about fieldset if any
// - modelName: name of the model this field belongs to
// - openai: OpenAI client instance
// - onStepUpdate: optional callback to report steps in detail
//
// Returns the updated structured text value after all transformations.
//
//********************************************************************************************

import OpenAI from 'openai';
import { ctxParamsType } from '../../../../entrypoints/Config/ConfigScreen';
import { basePrompt } from '../../../../prompts/BasePrompt';
import { availableResolutions } from '../../asset/generateUploadOnPrompt';
import generateFieldValue from '../generateFieldValue';
import { htmlToStructuredText } from 'datocms-html-to-structured-text';
import {
  extractTextValues,
  insertObjectAtIndex,
  reconstructObject,
  removeIds,
} from '../../../TranslateField';
import locale from 'locale-codes';
import { buildClient } from '@datocms/cma-client-browser';

const localeSelect = locale.getByTag;

type OnStepUpdateCallback = (message: string) => void;

/**
 * handleStructuredTextField
 *
 * Main function for structured_text fields. It handles two main scenarios:
 * - Improving existing structured text (isImprove = true)
 * - Generating new structured text from scratch (isImprove = false)
 *
 * When improving (isImprove = true):
 * - Checks if structured text is empty; if empty, just returns it.
 * - Translates/improves inline texts by calling OpenAI and substituting text nodes.
 * - If there are block nodes, generate/improve their fields as well.
 *
 * When generating new content (isImprove = false):
 * - Generates base HTML from WYSIWYG prompt.
 * - Converts HTML to structured text.
 * - Queries OpenAI to determine which blocks to insert.
 * - Generates content for each block and inserts them into the structured text.
 *
 * Uses onStepUpdate (if provided) to report each step to the caller.
 */
export async function handleStructuredTextField(
  blockLevel: number,
  itemTypes: Partial<Record<string, any>>,
  prompt: string,
  pluginParams: ctxParamsType,
  locale: string,
  datoKey: string,
  selectedResolution: availableResolutions,
  fieldValue: unknown,
  alert: (message: string) => Promise<void>,
  isImprove: boolean,
  fieldInfo: {
    name: string;
    apiKey: string;
    validatiors: string | null;
    hint: string | null;
  },
  formValues: Record<string, unknown>,
  fieldsetInfo: {
    name: string | null;
    hint: string | null;
  } | null,
  modelName: string,
  openai: OpenAI,
  onStepUpdate?: OnStepUpdateCallback
) {
  // If we are improving existing structured text
  if (isImprove) {
    onStepUpdate?.('Improving structured text: analyzing existing text...');
    let isEmptyStructuredText =
      Array.isArray(fieldValue) &&
      fieldValue.length === 1 &&
      typeof fieldValue[0] === 'object' &&
      fieldValue[0] !== null &&
      'type' in fieldValue[0] &&
      fieldValue[0].type === 'paragraph' &&
      fieldValue[0].children.length === 1 &&
      fieldValue[0].children[0].text === '';

    if (
      fieldValue &&
      typeof fieldValue === 'object' &&
      !Array.isArray(fieldValue) &&
      locale in (fieldValue as Record<string, unknown>)
    ) {
      const fieldValueInThisLocale = (fieldValue as Record<string, unknown>)[
        locale
      ];

      isEmptyStructuredText =
        Array.isArray(fieldValueInThisLocale) &&
        fieldValueInThisLocale.length === 1 &&
        typeof fieldValueInThisLocale[0] === 'object' &&
        fieldValueInThisLocale[0] !== null &&
        'type' in fieldValueInThisLocale[0] &&
        fieldValueInThisLocale[0].type === 'paragraph' &&
        fieldValueInThisLocale[0].children.length === 1 &&
        fieldValueInThisLocale[0].children[0].text === '';
    }
    if (!fieldValue || isEmptyStructuredText) {
      // Nothing to improve if empty
      return fieldValue;
    }

    onStepUpdate?.('Improving structured text: translating inline texts...');
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

    // Filter out blocks to improve inline text first
    const fieldValueWithoutBlocks = (noIdFieldValue as Array<unknown>).filter(
      (node: any) => node.type !== 'block'
    );

    const textValues = extractTextValues(fieldValueWithoutBlocks);

    let formattedPrompt = pluginParams.prompts?.basePrompt || basePrompt;

    // Improve inline text array using OpenAI
    const structuredTextcompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            formattedPrompt +
            ' Given the following strings array: ' +
            JSON.stringify(textValues, null, 2) +
            ' Do not add or remove any strings. keeping the initial value of the strings as much as possible, only modify the strings you need to improve the value to follow the following instruction: what you should do is: ' +
            prompt +
            ' Do not add or remove any strings. keeping the initial value as much as possible, only modify the strings you need to improve the value to follow that instruction' +
            ' Ignore empty strings and strings with just spaces, keep them as they are.  Return the updated strings array in a valid JSON format. The number of returned strings should be the same as the number of strings in the original array ' +
            ' translate your response to ' +
            localeSelect(locale).name,
        },
      ],
      model: pluginParams.gptModel,
    });

    const returnedTextValues = JSON.parse(
      structuredTextcompletion.choices[0].message.content!
    );

    const client = buildClient({
      apiToken: datoKey,
    });

    onStepUpdate?.('Improving structured text: processing block nodes...');
    for (const node of blockNodes) {
      const nodeCopy = { ...node };
      const blockModelId = nodeCopy.blockModelId;
      delete nodeCopy.originalIndex;
      delete nodeCopy.type;
      delete nodeCopy.children;
      delete nodeCopy.blockModelId;

      const fields = await client.fields.list(blockModelId);
      const orderedFields = fields.sort((a, b) => a.position - b.position);
      const fieldTypeDictionary = orderedFields.reduce((acc, field) => {
        acc[field.api_key] = {
          type: field.appearance.editor,
          validators: field.validators
            ? JSON.stringify(field.validators, null, 2)
            : null,
          hint: field.hint ? JSON.stringify(field.hint, null, 2) : null,
          availableBlocks:
            (field.validators.rich_text_blocks as Record<string, string[]>)
              ?.item_types ?? [],
        };
        return acc;
      }, {} as Record<string, { type: string; validators: string | null; hint: string | null; availableBlocks: string[] }>);

      for (const field in nodeCopy) {
        onStepUpdate?.(
          `Improving structured text: improving block field "${field}"...`
        );
        const generatedField = await generateFieldValue(
          1,
          itemTypes,
          prompt,
          fieldTypeDictionary[field].type,
          pluginParams,
          locale,
          datoKey,
          selectedResolution,
          nodeCopy[field],
          alert,
          isImprove,
          {
            name: field,
            apiKey: field,
            validatiors: fieldTypeDictionary[field].validators,
            hint: fieldTypeDictionary[field].hint,
          },
          formValues,
          null,
          {
            name: node.name || 'Unknown Block',
            apiKey: node.apiKey || 'block_api_key',
            generatedFields: fieldTypeDictionary,
          },
          fieldsetInfo,
          modelName,
          onStepUpdate
        );
        nodeCopy[field] = generatedField;
      }

      Object.assign(node, {
        ...nodeCopy,
        type: 'block',
        blockModelId: blockModelId,
      });
    }

    onStepUpdate?.(
      'Improving structured text: reconstructing final structure...'
    );
    // Reconstruct the object with the improved inline texts
    const reconstructedObject = reconstructObject(
      fieldValueWithoutBlocks,
      returnedTextValues
    );

    // Insert the block nodes back
    let finalReconstructedObject = reconstructedObject;
    for (const node of blockNodes as any[]) {
      finalReconstructedObject = insertObjectAtIndex(
        finalReconstructedObject,
        node,
        node.originalIndex
      );
    }

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

  // If not improving, we are generating new structured text
  onStepUpdate?.('Generating structured text: creating base document...');
  const trimmedFieldInfo = {
    name: fieldInfo.name,
    apiKey: fieldInfo.apiKey,
    validatiors: null,
    hint: fieldInfo.hint,
  };

  // Generate a base HTML using wysiwyg prompt
  const baseDocument = await generateFieldValue(
    0,
    itemTypes,
    prompt + ' make the output very long and with several html tags being used',
    'wysiwyg',
    pluginParams,
    locale,
    datoKey,
    selectedResolution,
    '',
    alert,
    false,
    trimmedFieldInfo,
    formValues,
    null,
    null,
    fieldsetInfo,
    modelName,
    onStepUpdate
  );

  onStepUpdate?.(
    'Generating structured text: converting HTML to structured text...'
  );
  const structuredTextBaseDocument = await htmlToStructuredText(
    baseDocument as string
  );

  function replaceValueWithText(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => replaceValueWithText(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const newObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'value') {
          newObj['text'] = value;
        } else {
          newObj[key] = replaceValueWithText(value);
        }
      }
      return newObj;
    }

    return obj;
  }

  function removeSpanType(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => removeSpanType(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const newObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'type' && value === 'span') {
          continue;
        }
        newObj[key] = removeSpanType(value);
      }
      return newObj;
    }

    return obj;
  }

  const cleanedDocument = removeSpanType(structuredTextBaseDocument?.document);
  const structuredTextBase = replaceValueWithText(cleanedDocument.children);

  const validators = JSON.parse(fieldInfo.validatiors!);
  const structuredTextBlocks = validators.structured_text_blocks.item_types;

  if (!structuredTextBlocks.length) {
    // No blocks to insert, just return the base doc
    return structuredTextBase;
  }

  const blocksWithNames = structuredTextBlocks.map((block: string) => {
    return {
      name: itemTypes[block]!.attributes.name!,
      apiKey: itemTypes[block]!.attributes.api_key!,
      blockModelId: itemTypes[block]!.id!,
    };
  });

  onStepUpdate?.(
    'Generating structured text: selecting which blocks to insert...'
  );
  const blockPrompt =
    basePrompt +
    ' Based on the prompt ' +
    prompt +
    ' what available blocks should I insert into this html? ' +
    baseDocument +
    ' The available blocks are: ' +
    JSON.stringify(blocksWithNames, null, 2) +
    ' return the response as an array of objects as a valid JSON. Choose only the necessary blocks.' +
    ' Add a "prompt" key to each block with an instruction starting with "Generate a block that..."';

  const blockPromptResponse = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: blockPrompt,
      },
    ],
    model: pluginParams.gptModel,
  });

  const blockTypeResponses = await JSON.parse(
    blockPromptResponse.choices[0].message.content!
  );

  const blockArray: any[] = [];

  onStepUpdate?.(
    'Generating structured text: generating content for chosen blocks...'
  );
  for (const block of blockTypeResponses) {
    await generateFieldValue(
      blockLevel,
      itemTypes,
      block.prompt,
      'rich_text',
      pluginParams,
      locale,
      datoKey,
      selectedResolution,
      blockArray,
      alert,
      false,
      fieldInfo,
      formValues,
      {
        name: block.name,
        apiKey: block.apiKey,
        blockModelId: block.blockModelId,
        availableBlocks: block.availableBlocks,
      },
      null,
      fieldsetInfo,
      modelName,
      onStepUpdate
    );
  }

  const structuredFormatedBlockArray = blockArray.map((block) => {
    const blockCopy = { ...block };
    delete blockCopy.blockModelId;
    return {
      blockModelId: block.itemTypeId,
      children: [{ text: '' }],
      type: 'block',
      ...blockCopy,
    };
  });

  onStepUpdate?.(
    'Generating structured text: merging selected blocks into the structured text...'
  );
  const finalPrompt =
    basePrompt +
    ' insert into the following JSON array of objects :' +
    JSON.stringify(structuredTextBase, null, 2) +
    ' the following objects in this JSON array, at appropriate positions: ' +
    JSON.stringify(structuredFormatedBlockArray, null, 2) +
    ' return the exact JSON array.';

  const finalCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: finalPrompt,
      },
    ],
    model: pluginParams.gptModel,
  });

  const finalResponse = JSON.parse(finalCompletion.choices[0].message.content!);

  return finalResponse;
}
