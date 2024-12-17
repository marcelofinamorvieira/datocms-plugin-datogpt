//********************************************************************************************
// generateFieldValue.ts
//
// This file is responsible for generating or improving field values using OpenAI responses.
// It handles various field types, including text, structured fields, SEO fields, and media fields,
// and orchestrates prompting and parsing logic to produce the final field value.
//
// Core Functionality:
// - Communicates with OpenAI via the provided API key and model parameters.
// - Generates field values according to user prompts, improving existing ones when requested.
// - Handles different field types with customized logic, including default text fields, SEO fields,
//   galleries, structured_text fields, and blocks within rich text fields.
// - If block fields are encountered, it may recursively generate nested fields according to the
//   plugin's advanced settings.
// - Supports improvement of existing values (if isImprove = true), as well as generating entirely new
//   values (if isImprove = false).
//
// High-Level Steps:
// 1. Prepare a prompt and context, including model parameters and field hints.
// 2. Depending on the field type, generate or improve the value.
// 3. If the field is of a special type (SEO, structured_text, gallery, file), handle accordingly.
// 4. Recursively handle blocks for structured or rich text fields, if any.
// 5. Parse and return the final field value back to the caller.
//********************************************************************************************

import OpenAI from 'openai';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import generateUploadOnPrompt, {
  Upload,
  availableResolutions,
} from '../asset/generateUploadOnPrompt';
import { basePrompt } from '../../../prompts/BasePrompt';
import locale from 'locale-codes';
import { fieldPrompt } from '../../../prompts/FieldPrompts';
import parseGptValue from './parseGptValue';
import { buildClient } from '@datocms/cma-client-browser';
import { ItemType } from 'datocms-plugin-sdk';
import { htmlToStructuredText } from 'datocms-html-to-structured-text';

const localeSelect = locale.getByTag;

/**
 * generateFieldValue
 * ------------------
 * Main exported function that, given a prompt, field type, and current field value,
 * uses OpenAI to generate or improve the field value.
 *
 * Parameters:
 * @param blockLevel (number): Current depth of block generation. Used to limit nested block complexity.
 * @param itemTypes (Record<string, ItemType>): Available item (block) types.
 * @param prompt (string): The user's prompt guiding content generation.
 * @param fieldType (string): The type of the field to generate/improve (e.g., single_line, file, etc.).
 * @param pluginParams (ctxParamsType): Plugin parameters, including API keys, model, and advanced settings.
 * @param locale (string): The locale in which we generate/improve the value.
 * @param datoKey (string): DatoCMS API token to upload assets if needed.
 * @param selectedResolution (availableResolutions): Chosen resolution for image generation (for assets).
 * @param currentFieldValue (unknown): The current value of the field, if any.
 * @param alert (Function): A function to show alerts in the CMS UI.
 * @param isImprove (boolean): Whether we are improving an existing value (true) or generating new (false).
 * @param fieldInfo (object): Information about the current field (name, apiKey, validators, hint).
 * @param formValues (Record<string, unknown>): The entire record's form values, used for context.
 * @param blockInfo (object|null): If this field is part of a block, info about that block.
 * @param parentBlockInfo (object|null): If we are nested inside a block, info about the parent block.
 * @param fieldsetInfo (object|null): Information about the fieldset this field belongs to, if any.
 * @param modelName (string): Name of the model containing this field.
 *
 * Returns: Promise<unknown> - The generated or improved field value.
 *
 * Process:
 * 1. Setup OpenAI client with API key.
 * 2. If localized, extract the relevant value for this locale.
 * 3. If the field is a file or gallery, handle image generation by calling `generateUploadOnPrompt`.
 * 4. If it's structured_text or rich_text, handle block-level generation and recursion.
 * 5. For simple text fields, build a context prompt and ask the model for a generated value.
 * 6. Parse the resulting GPT response using `parseGptValue`.
 * 7. Return the final processed value.
 *
 * Notes:
 * - This code is very sensitive and complex; minimal changes have been made apart from commenting.
 * - Each field type and scenario is handled case-by-case, following logic that existed previously.
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
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  let fieldValue = currentFieldValue;

  // If the field is localized (object with multiple locales), pick the value for the current locale
  if (
    fieldValue &&
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    (fieldValue as Record<string, unknown>)[locale]
  ) {
    fieldValue = (fieldValue as Record<string, unknown>)[locale];
  }

  let fieldTypePrompt = ' Return the response in the format of ';

  //--------------------------------------------------------------------------------------------
  // Handle file fields (single image generation)
  // If the field is a file:
  // - If block level > 0 and blockAssetsGeneration is 'null', return null (do not generate)
  // - Otherwise, generate a prompt for DALL-E and generate an image asset.
  //--------------------------------------------------------------------------------------------
  if (fieldType === 'file') {
    if (
      pluginParams.advancedSettings.blockAssetsGeneration === 'null' &&
      blockLevel > 0
    ) {
      return null;
    }

    const contextCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          // Construct a meta-prompt to generate a perfect DALL-E prompt for this specific field
          content:
            basePrompt +
            'Generate the perfect prompt for a field ' +
            fieldInfo.name +
            ' field, ' +
            ' that is an instance of a ' +
            modelName +
            ' , ' +
            ' Respect the name of the field in regards to context of the meta prompt that you will generate.' +
            ' the intention of the user is to ' +
            prompt +
            ' make sure that the prompt generated is specifically for the ' +
            fieldInfo.name +
            ' field. Make the prompt very specific for a ' +
            fieldInfo.name +
            ' field. Make sure your prompt to DALL-E3 takes that into account.' +
            (fieldsetInfo?.name
              ? ' considering it is in the ' + fieldsetInfo.name + ' fieldset '
              : '') +
            (fieldsetInfo?.hint
              ? ' that has the description of ' + fieldsetInfo.hint
              : '') +
            (parentBlockInfo
              ? ' that is part of a block named ' +
                parentBlockInfo.name +
                ' block ' +
                ' considering that we already generated the following fields: ' +
                JSON.stringify(parentBlockInfo.generatedFields, null, 2)
              : '') +
            ' considering the context of the record ' +
            JSON.stringify(formValues, null, 2) +
            ' do not mention that it has several locales or languages, remember to return a prompt, that should always start with "Generate a ' +
            fieldInfo.name +
            ' image depicting ... mainly condsidering that the context talks about... and that there are already fields with values like ...(using here information from the context of the record provided above)',
        },
      ],
      model: pluginParams.gptModel,
    });

    const metaPrompt = contextCompletion.choices[0].message.content!;

    // Generate the image using Dall-E:
    return (
      await generateUploadOnPrompt(
        metaPrompt,
        openai,
        datoKey,
        locale,
        pluginParams.dallEModel,
        selectedResolution
      )
    )[0];
  }

  //--------------------------------------------------------------------------------------------
  // Handle gallery fields (multiple images):
  // Similar logic to 'file' field but adds newly generated assets to the existing array.
  //--------------------------------------------------------------------------------------------
  if (fieldType === 'gallery') {
    if (
      pluginParams.advancedSettings.blockAssetsGeneration === 'null' &&
      blockLevel > 0
    ) {
      return null;
    }

    let galleryArray = fieldValue as Array<Upload>;
    if (!galleryArray || !galleryArray.length) {
      galleryArray = [];
    }

    try {
      // Generate a prompt for the gallery images
      const contextCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              basePrompt +
              'Generate the perfect prompt for a field ' +
              fieldInfo.name +
              ' field, ' +
              ' that is an instance of a ' +
              modelName +
              ' , ' +
              ' Respect the name of the field in regards to context of the meta prompt that you will generate.' +
              ' the intention of the user is to ' +
              prompt +
              ' make sure that the prompt generated is specifically for the ' +
              fieldInfo.name +
              ' field. Make the prompt very specific for a ' +
              fieldInfo.name +
              ' field. Make sure your prompt to DALL-E3 takes that into account.' +
              (fieldsetInfo?.name
                ? ' considering it is in the ' +
                  fieldsetInfo.name +
                  ' fieldset '
                : '') +
              (fieldsetInfo?.hint
                ? ' that has the description of ' + fieldsetInfo.hint
                : '') +
              (parentBlockInfo
                ? ' that is part of a block named ' +
                  parentBlockInfo.name +
                  ' block ' +
                  ' considering that we already generated the following fields: ' +
                  JSON.stringify(parentBlockInfo.generatedFields, null, 2)
                : '') +
              ' considering the context of the record ' +
              JSON.stringify(formValues, null, 2) +
              ' do not mention that it has several locales or languages, remember to return a prompt, that should always start with "Generate a ' +
              fieldInfo.name +
              ' image depicting ... mainly condsidering that the context talks about... and that there are already fields with values like ...(using here information from the context of the record provided above)',
          },
        ],
        model: pluginParams.gptModel,
      });

      const metaPrompt = contextCompletion.choices[0].message.content!;
      // Generate one more image and add it to the gallery array
      galleryArray.push(
        (
          await generateUploadOnPrompt(
            metaPrompt,
            openai,
            datoKey,
            locale,
            pluginParams.dallEModel,
            selectedResolution
          )
        )[0]
      );
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unknown error occurred');
      }
      return galleryArray;
    }

    return galleryArray;
  }

  //--------------------------------------------------------------------------------------------
  // Handle structured_text fields:
  // For structured_text, generate a base HTML document and convert it into structured text,
  // then possibly insert blocks determined by GPT.
  //--------------------------------------------------------------------------------------------
  if (fieldType === 'structured_text') {
    // Create a trimmed fieldInfo to avoid passing large validators for the next steps
    const trimmedFieldInfo = {
      name: fieldInfo.name,
      apiKey: fieldInfo.apiKey,
      validatiors: null,
      hint: fieldInfo.hint,
    };

    // Step 1: Generate a base HTML using the wysiwyg prompt
    const baseDocument = await generateFieldValue(
      0,
      itemTypes,
      prompt +
        ' make the output very long and with several html tags being used',
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

    // Convert the generated HTML to structured text
    const structuredTextBaseDocument = await htmlToStructuredText(baseDocument);

    // Helper functions to reformat structured text nodes
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
            // Skip adding 'type' if it's 'span'
            continue;
          }
          newObj[key] = removeSpanType(value);
        }
        return newObj;
      }

      return obj;
    }

    const cleanedDocument = removeSpanType(
      structuredTextBaseDocument?.document
    );

    const structuredTextBase = replaceValueWithText(cleanedDocument.children);

    // Extract validators to find allowed blocks
    const validators = JSON.parse(fieldInfo.validatiors!);
    const structuredTextBlocks = validators.structured_text_blocks.item_types;

    if (!structuredTextBlocks.length) {
      // If no blocks are allowed, just return the structured text base
      return structuredTextBase;
    }

    // If blocks are allowed, we must figure out which blocks to add
    const blocksWithNames = structuredTextBlocks.map((block: string) => {
      return {
        name: itemTypes[block]!.attributes.name!,
        apiKey: itemTypes[block]!.attributes.api_key!,
        blockModelId: itemTypes[block]!.id!,
      };
    });

    // Ask GPT which blocks to insert into the HTML
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

    // For each suggested block, generate its content
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

    // Reformat the generated blocks for structured text
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

    // Insert the generated blocks back into the original structured text at appropriate positions
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

    const finalResponse = JSON.parse(
      finalCompletion.choices[0].message.content!
    );

    return finalResponse;
  }

  //--------------------------------------------------------------------------------------------
  // Handle rich_text fields:
  // If blockInfo is provided, we are dealing with modular content inside a rich_text.
  // This involves generating content for each field in a block or auto-selecting blocks.
  //--------------------------------------------------------------------------------------------
  if (!!blockInfo) {
    const client = buildClient({
      apiToken: datoKey,
    });

    // If the block type is "auto_select_gpt_plugin", GPT decides which blocks to create
    if (blockInfo.apiKey === 'auto_select_gpt_plugin') {
      const availableFieldNames = blockInfo.availableBlocks.map((blockId) => {
        return {
          name: itemTypes[blockId]!.attributes.name!,
          apiKey: itemTypes[blockId]!.attributes.api_key!,
          blockModelId: itemTypes[blockId]!.id!,
        };
      });

      // Ask GPT which blocks to create and generate them
      const blockPrompt =
        basePrompt +
        ' Based on the prompt ' +
        prompt +
        ' what available blocks should I create to better acomplish the prompt? The available blocks are: ' +
        JSON.stringify(availableFieldNames, null, 2) +
        ' return the response as an array of objects as a valid JSON, deleting the blocks that should not be created for this prompt, and keeping the ones that should be created. You can repeat a block more times than one if you think it is necessary for the prompt' +
        ' add to the following object a "prompt" key to each block, the prompt value should be an instruction, a prompt, to generate the value, always starting with "Generate a block that..."';

      const blockTypeCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: blockPrompt,
          },
        ],
        model: pluginParams.gptModel,
      });

      const blockTypeResponses = await JSON.parse(
        blockTypeCompletion.choices[0].message.content!
      );

      const currentValueCopy = fieldValue as Array<Record<string, any>>;

      // For each chosen block, generate its content recursively
      for (const block of blockTypeResponses) {
        await generateFieldValue(
          blockLevel,
          itemTypes,
          block.prompt,
          fieldType,
          pluginParams,
          locale,
          datoKey,
          selectedResolution,
          currentValueCopy,
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

      return currentValueCopy;
    }

    // If we have a known block type:
    const fieldValueCopy = fieldValue as Array<Record<string, any>>;
    const fields = await client.fields.list(blockInfo.blockModelId);
    const orderedFields = fields.sort((a, b) => a.position - b.position);

    // Create a dictionary for each field in the block, mapping api_key to field info
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

    const attributes = { ...fieldTypeDictionary };

    // For each field in the block, generate a value
    for (const field in fieldTypeDictionary) {
      if (fieldTypeDictionary[field].type === 'rich_text') {
        // If nested blocks exist and we exceed max depth, return null
        if (blockLevel > pluginParams.advancedSettings.blockGenerateDepth - 1) {
          return null;
        }

        // Recursively generate the rich_text block fields
        const fieldValue = await generateFieldValue(
          blockLevel + 1,
          itemTypes,
          prompt,
          fieldTypeDictionary[field].type,
          pluginParams,
          locale,
          datoKey,
          selectedResolution,
          [],
          alert,
          isImprove,
          {
            name: field,
            apiKey: field,
            validatiors: fieldTypeDictionary[field].validators,
            hint: fieldTypeDictionary[field].hint,
          },
          formValues,
          {
            name: field,
            apiKey: 'auto_select_gpt_plugin',
            blockModelId: fieldTypeDictionary[field].availableBlocks[0],
            availableBlocks: fieldTypeDictionary[field].availableBlocks,
          },
          {
            name: blockInfo.name,
            apiKey: blockInfo.apiKey,
            generatedFields: attributes,
          },
          fieldsetInfo,
          modelName
        );
        attributes[field] = fieldValue;
      } else {
        // For other field types in this block:
        const fieldValue = await generateFieldValue(
          blockLevel + 1,
          itemTypes,
          prompt +
            ' that is part of a ' +
            blockInfo.name +
            ' block, and is a ' +
            fieldInfo.name +
            ' field',
          fieldTypeDictionary[field].type,
          pluginParams,
          locale,
          datoKey,
          selectedResolution,
          null,
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
            name: blockInfo.name,
            apiKey: blockInfo.apiKey,
            generatedFields: attributes,
          },
          fieldsetInfo,
          modelName
        );
        attributes[field] = fieldValue;
      }
    }

    // Append the generated block with all fields resolved to the field value array
    fieldValueCopy.push({
      itemTypeId: blockInfo.blockModelId,
      ...attributes,
    });

    return fieldValueCopy;
  }

  //--------------------------------------------------------------------------------------------
  // Handle default text fields:
  // If none of the special conditions apply, we proceed with default text field logic.
  // This involves using a field type prompt from fieldPrompt and generating/improving the value.
  //--------------------------------------------------------------------------------------------
  const fieldPromptObject = pluginParams.prompts?.fieldPrompts.single_line
    ? pluginParams.prompts?.fieldPrompts
    : fieldPrompt;

  if (
    !(
      fieldPromptObject[fieldType as keyof typeof fieldPrompt] ||
      fieldPrompt[fieldType as keyof typeof fieldPrompt]
    )
  ) {
    return null;
  }

  fieldTypePrompt +=
    fieldPromptObject[fieldType as keyof typeof fieldPrompt] ||
    fieldPrompt[fieldType as keyof typeof fieldPrompt];

  // Prepare the record context as JSON without internalLocales for clarity
  const recordContextJson = formValues;
  delete recordContextJson.internalLocales;

  // Generate a meta prompt to gather context and produce the final prompt to GPT
  const contextCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          basePrompt +
          'Generate the perfect prompt for a field ' +
          fieldInfo.name +
          ' field, ' +
          ' that is an instance of a ' +
          modelName +
          ' , ' +
          ' Respect the name of the field in regards to context of the meta prompt that you will generate.' +
          ' the intention of the user is to ' +
          prompt +
          ' make sure that the prompt generated is specifically for the ' +
          fieldInfo.name +
          ' field. Make the prompt very specific for a ' +
          fieldInfo.name +
          ' field. ' +
          (fieldsetInfo?.name
            ? ' considering it is in the ' + fieldsetInfo.name + ' fieldset '
            : '') +
          (fieldsetInfo?.hint
            ? ' that has the description of ' + fieldsetInfo.hint
            : '') +
          (parentBlockInfo
            ? ' that is part of a block named ' +
              parentBlockInfo.name +
              ' block ' +
              ' considering that we already generated the following fields: ' +
              JSON.stringify(parentBlockInfo.generatedFields, null, 2)
            : '') +
          ' considering the context of the record ' +
          JSON.stringify(formValues, null, 2) +
          ' do not mention that it has several locales or languages, remember to return a prompt, that should always start with "Generate a ' +
          fieldInfo.name +
          ' field with a value ... condsidering that the context talks about... and that there are already fields with values like ...(using here information from the context of the record provided above)',
      },
    ],
    model: pluginParams.gptModel,
  });

  const metaPrompt = contextCompletion.choices[0].message.content;

  let formattedPrompt = pluginParams.prompts?.basePrompt || basePrompt;

  // If we are generating a new value:
  if (!isImprove) {
    formattedPrompt +=
      fieldTypePrompt +
      ' what you should do is ' +
      metaPrompt +
      ' the label of the field that you are generating a value to is ' +
      fieldInfo.name +
      ' make it so the field label is the most important contextual clue. If the lable is answer, the result should be an answer, if the label is title, the result should be a title, and so on. ' +
      (fieldInfo.hint ? ' its writting instruction is ' + fieldInfo.hint : '') +
      (fieldInfo.validatiors && fieldType !== 'rich_text'
        ? ' and its validators are ' +
          fieldInfo.validatiors +
          ' if present, always respect the length max and min number of characters'
        : '') +
      ' use this information only for conceptual purposes, do not mention it in your response or make it alter the response format, do not include the field label in your response, but if the field label is "URL" return a URL, if it is "title" return a title, and so on. But always keep the response in the format of ' +
      fieldTypePrompt +
      ' translate your response to ' +
      localeSelect(locale).name;
  } else {
    // If we are improving existing value:
    formattedPrompt +=
      ' Improove on the previous field value that was ' +
      (typeof fieldValue === 'object'
        ? JSON.stringify(fieldValue, null, 2)
        : fieldValue) +
      ' keeping the most of the initial value, only modify what you need to improve the value to follow the following instruction: what you should do is ' +
      prompt +
      ' the label of the field that you are generating a value to is ' +
      fieldInfo.name +
      'make it so the field label is the most important contextual clue. ' +
      (fieldInfo.hint ? ' its writting instruction is ' + fieldInfo.hint : '') +
      (fieldInfo.validatiors && fieldType !== 'rich_text'
        ? ' and its validators are ' +
          fieldInfo.validatiors +
          ' if present, always respect the length max and min number of characters'
        : '') +
      ' use this information only for conceptual purposes, do not mention it in your response or make it alter the response format, do not include the field label in your response, but if the field label is "URL" return a URL, if it is "title" return a title, and so on. But always keep the response in the format of ' +
      fieldTypePrompt +
      ' By doing the following:' +
      prompt +
      fieldTypePrompt +
      ' translate your response to ' +
      localeSelect(locale).name +
      fieldTypePrompt;
  }

  // Request a response from OpenAI with the final formatted prompt
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: formattedPrompt,
      },
    ],
    model: pluginParams.gptModel,
  });

  // Parse the returned value using parseGptValue
  const parsedValue = await parseGptValue(
    fieldType,
    completion.choices[0].message.content!,
    openai,
    datoKey,
    locale,
    pluginParams,
    selectedResolution
  ).catch((error) => {
    throw (
      'GPT response for the "' +
      fieldInfo.name +
      '" field: \n' +
      completion.choices[0].message.content +
      ' error: ' +
      error
    );
  });

  return parsedValue;
};

export default generateFieldValue;
