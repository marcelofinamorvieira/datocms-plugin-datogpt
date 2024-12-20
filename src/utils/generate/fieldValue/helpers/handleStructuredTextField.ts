//********************************************************************************************
// handleStructuredTextField.ts
//
// Extracted logic for handling 'structured_text' fields from generateFieldValue.
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
  openai: OpenAI
) {
  const trimmedFieldInfo = {
    name: fieldInfo.name,
    apiKey: fieldInfo.apiKey,
    validatiors: null,
    hint: fieldInfo.hint,
  };

  if (isImprove) {
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
      return fieldValue;
    }
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
            ' Ignore empty strings and strings with just spaces (but do not remove them), keep them as they are.  Return the updated strings array in a valid JSON format do not remove spaces or empty strings. The number of returned strings should be the same as the number of strings in the original array ' +
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
          fieldInfo,
          formValues,
          null,
          null,
          fieldsetInfo,
          modelName
        );
        nodeCopy[field] = generatedField;
      }

      Object.assign(node, {
        ...nodeCopy,
        type: 'block',
        blockModelId: blockModelId,
      });
    }

    // Reconstruct the object with the translated inline texts
    const reconstructedObject = reconstructObject(
      fieldValueWithoutBlocks,
      returnedTextValues
    );

    // Insert the translated block nodes back into their original positions
    let finalReconstructedObject = reconstructedObject;
    for (const node of blockNodes as any[]) {
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
    isImprove,
    trimmedFieldInfo,
    formValues,
    null,
    null,
    fieldsetInfo,
    modelName
  );

  const structuredTextBaseDocument = await htmlToStructuredText(baseDocument);

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
    return structuredTextBase;
  }

  const blocksWithNames = structuredTextBlocks.map((block: string) => {
    return {
      name: itemTypes[block]!.attributes.name!,
      apiKey: itemTypes[block]!.attributes.api_key!,
      blockModelId: itemTypes[block]!.id!,
    };
  });

  const blockPrompt =
    basePrompt +
    ' Based on the prompt ' +
    prompt +
    ' what available blocks should I insert into this html? ' +
    baseDocument +
    ' The available blocks are: ' +
    JSON.stringify(blocksWithNames, null, 2) +
    ' return the response as an array of objects as a valid JSON, deleting the blocks that should not be created for this prompt, and keeping the ones that should be created. Make sure to keep only the blocks that are appropriate in the context of the HTML. Choose only the ones really necessary, be conservative with the number of blocks you insert. You can repeat a block more times than one if you think it is necessary for the prompt, also, make sure not to repeat info that is already present in the html ' +
    ' add to the following object a "prompt" key to each block, the prompt value should be an instruction, a prompt, to generate the value, always starting with "Generate a block that..."';

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
      isImprove,
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
      modelName
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

  const finalPrompt =
    basePrompt +
    ' insert into the following JSON array of objects :' +
    JSON.stringify(structuredTextBase, null, 2) +
    ' the following objects in this JSON array, in the approprite positions, where it is contextually approprite, do not repeat any object, and use all of them: ' +
    JSON.stringify(structuredFormatedBlockArray, null, 2) +
    ' return the exact JSON array at the start of this message, do not remove or alter anything, just add the objects from the second array into the first one in the correct positions';

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
