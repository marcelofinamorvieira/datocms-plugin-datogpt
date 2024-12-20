//********************************************************************************************
// handleDefaultField.ts
//
// Extracted logic for handling default (non-special) field types from generateFieldValue.
//********************************************************************************************

import OpenAI from 'openai';
import { ctxParamsType } from '../../../../entrypoints/Config/ConfigScreen';
import { basePrompt } from '../../../../prompts/BasePrompt';
import { fieldPrompt } from '../../../../prompts/FieldPrompts';
import { availableResolutions } from '../../asset/generateUploadOnPrompt';
import parseGptValue from '../parseGptValue';
import locale from 'locale-codes';

const localeSelect = locale.getByTag;

export async function handleDefaultField(
  _blockLevel: number,
  _itemTypes: Partial<Record<string, any>>,
  prompt: string,
  fieldType: string,
  pluginParams: ctxParamsType,
  locale: string,
  datoKey: string,
  selectedResolution: availableResolutions,
  fieldValue: unknown,
  _alert: (message: string) => Promise<void>,
  isImprove: boolean,
  fieldInfo: {
    name: string;
    apiKey: string;
    validatiors: string | null;
    hint: string | null;
  },
  formValues: Record<string, unknown>,
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
  openai: OpenAI
) {
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

  let fieldTypePrompt = ' Return the response in the format of ';
  fieldTypePrompt +=
    fieldPromptObject[fieldType as keyof typeof fieldPrompt] ||
    fieldPrompt[fieldType as keyof typeof fieldPrompt];

  const recordContextJson = formValues;
  delete recordContextJson.internalLocales;

  let formattedPrompt = pluginParams.prompts?.basePrompt || basePrompt;

  if (!isImprove) {
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
    formattedPrompt +=
      ' Improve on the previous field value that was ' +
      (typeof fieldValue === 'object'
        ? JSON.stringify(fieldValue, null, 2)
        : fieldValue) +
      ' keeping the initial value as much as possible, only modify what you need to improve the value to follow the following instruction: what you should do is ' +
      prompt +
      ' keeping the initial value as much as possible, only modify what you need to improve the value to follow that instruction' + //the repetition here is good.
      ' the label of the field that you are generating a value to is ' +
      fieldInfo.name +
      ' take the field label as a contextual clue. ' +
      (fieldInfo.validatiors && fieldType !== 'rich_text'
        ? ' and its validators are ' +
          fieldInfo.validatiors +
          ' if present, always respect the length max and min number of characters'
        : '') +
      ' use this information only for conceptual purposes, do not mention it in your response or make it alter the response format, do not include the field label in your response, but if the field label is "URL" return a URL, if it is "title" return a title, and so on. But always keep the response in the format of ' +
      fieldTypePrompt +
      ' translate your response to ' +
      localeSelect(locale).name;
  }

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: formattedPrompt,
      },
    ],
    model: pluginParams.gptModel,
  });

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
}
