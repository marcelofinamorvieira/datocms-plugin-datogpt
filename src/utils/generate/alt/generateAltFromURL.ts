import OpenAI from 'openai';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import { AltGenerationPrompt } from '../../../prompts/AltGenerationPrompt';
import locale from 'locale-codes';

//********************************************************************************************
// This utility function, generateAltFromURL, aims to produce a descriptive alt text for a
// provided image URL. It leverages the OpenAI API to analyze the image content and generate
// a suitable alt text that matches the given locale. The logic applies a base prompt for alt
// generation and includes instructions to translate the result into the target locale.
//
// Improvements implemented:
// 1. Robust Error Handling and Logging:
//    - The code now gracefully handles errors that occur during the OpenAI request.
//    - Any failure in generating the alt text triggers logging the issue and returning a
//      fallback alt text to ensure the application doesn't break unexpectedly.
//
// 2. Abstracted Locale Selection Logic:
//    - The logic for obtaining the locale name from a locale tag is now handled by a separate
//      helper function (getLocaleName). This abstraction makes it easier to maintain and modify
//      locale handling in the future.
//
// The entire file is now comprehensively commented to facilitate future maintenance.
//
//********************************************************************************************

//--------------------------------------------------------------------------------------------
// Helper function: getLocaleName
//--------------------------------------------------------------------------------------------
// This function retrieves the human-readable name associated with a given locale tag.
// If no matching locale is found, it logs a warning and defaults to "English".
//
// @param {string} localeTag - The IETF language tag (e.g., "en-US", "fr", "pt-BR").
// @returns {string} - The human-readable locale name (e.g., "English") or a fallback if not found.
//--------------------------------------------------------------------------------------------
function getLocaleName(localeTag: string): string {
  const selected = locale.getByTag(localeTag);
  if (!selected || !selected.name) {
    console.warn(`Locale '${localeTag}' not found. Using English as fallback.`);
    return 'English';
  }
  return selected.name;
}

//--------------------------------------------------------------------------------------------
// Main function: generateAltFromURL
//--------------------------------------------------------------------------------------------
// Asynchronously generates an alt text for the provided image URL by querying the OpenAI API.
// It uses a prompt to guide the model into producing a suitable alt text, translated into
// the specified locale. If the API fails or no alt text is returned, a fallback alt text
// is provided, and errors are logged.
//
// @param {string} url - The URL of the image to analyze.
// @param {ctxParamsType} pluginParams - Plugin configuration parameters, including the OpenAI API key and prompts.
// @param {string} locale - The desired locale to translate the alt text into.
// @returns {Promise<string>} - The generated alt text. If an error occurs, returns a fallback alt text.
//
// Steps:
// 1. Retrieve the alt generation prompt (or use a default).
// 2. Obtain the locale name from the provided locale tag.
// 3. Build a message payload compatible with OpenAI's chat completion endpoint.
// 4. Make a request to OpenAI to generate the alt text.
// 5. If successful, return the alt text. If not, log the error and return a fallback.
//
// Error Handling:
// - If the model doesn't return a content, log an error and return "Image description unavailable."
// - If the request to OpenAI fails, log the error and return the fallback alt text.
//
// Logging:
// - Warnings are logged if locale selection fails.
// - Errors are logged if the OpenAI request fails or returns an empty response.
//--------------------------------------------------------------------------------------------
async function generateAltFromURL(
  url: string,
  pluginParams: ctxParamsType,
  locale: string
): Promise<string> {
  // Create an instance of OpenAI configured with the provided API key
  const openai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  // Determine the prompt: use the custom one if provided, else fallback to the default AltGenerationPrompt
  const altPrompt = pluginParams.prompts?.altGenerationPrompt || AltGenerationPrompt;

  // Resolve the human-readable locale name
  const localeName = getLocaleName(locale);

  // Prepare the messages array that will guide the OpenAI model
  const messages = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `${altPrompt} translate your response to ${localeName}`,
        },
        {
          type: 'image_url' as const,
          image_url: { url },
        },
      ],
    },
  ];

  try {
    // Request a chat completion from OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });

    // Extract the generated alt text from the model response
    const altText = response.choices[0]?.message?.content;

    // If no alt text is provided, log an error and return a fallback
    if (!altText) {
      console.error('No alt text returned by OpenAI model. Returning fallback.');
      return 'Image description unavailable.';
    }

    // Return the successfully generated alt text
    return altText;
  } catch (error: any) {
    // Catch and log any errors from the OpenAI request and return a fallback alt text
    console.error('Error generating alt text from OpenAI:', error);
    return 'Image description unavailable.';
  }
}

export default generateAltFromURL;