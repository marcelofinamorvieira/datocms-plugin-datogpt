import OpenAI from 'openai';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import { AltGenerationPrompt } from '../../../prompts/AltGenerationPrompt';
import locale from 'locale-codes';

const localeSelect = locale.getByTag;

const generateAltFromURL = async (
  url: string,
  pluginParams: ctxParamsType,
  locale: string
) => {
  const openai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              (pluginParams.prompts?.altGenerationPrompt ||
                AltGenerationPrompt) +
              ' translate your response to ' +
              localeSelect(locale).name,
          },
          {
            type: 'image_url',
            image_url: {
              url,
            },
          },
        ],
      },
    ],
  });

  return response.choices[0].message.content;
};

export default generateAltFromURL;
