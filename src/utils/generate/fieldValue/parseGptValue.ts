//********************************************************************************************
// parseGptValue.ts
//
// This file contains logic to parse the raw OpenAI response for a given field type
// into a final value suitable for the CMS field. Different field types require specific
// transformations (e.g., SEO fields need a JSON object, integers/floats need numeric parsing).
//
// The logic switches on fieldType and applies the appropriate conversion.
// If the field is an SEO field, it expects a JSON with title/description/image prompt.
// If it's integer or float, it parses numeric values.
// If it's boolean, it converts "1" to true and "0" to false.
// For maps, color_picker, and json fields, it parses JSON directly.
//
// After parsing, the returned value is what will be stored in DatoCMS.
//********************************************************************************************

import OpenAI from 'openai';
import generateUploadOnPrompt, {
  availableResolutions,
} from '../asset/generateUploadOnPrompt';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';

/**
 * Helper function to parse strings into numbers.
 * This ensures consistent numeric parsing logic in one place.
 *
 * @param value (string): The string to parse into a number.
 * @param isFloat (boolean): Whether to parse as float or integer. Defaults to false (integer).
 * @returns (number): Parsed numeric value.
 */
function toNumber(value: string, isFloat = false) {
  const cleaned = value.replace(/"/g, '');
  return isFloat ? parseFloat(cleaned) : parseInt(cleaned);
}

/**
 * parseGptValue
 * -------------
 * Given a field type and a GPT response string, this function parses the GPT response
 * into the appropriate JavaScript value for that field type.
 *
 * Parameters:
 * @param fieldType (string): The DatoCMS field type (e.g. 'seo', 'integer', 'color_picker').
 * @param gptResponse (string): The raw response from OpenAI.
 * @param openai (OpenAI): The OpenAI client instance.
 * @param datoKey (string): DatoCMS API token.
 * @param locale (string): Current locale.
 * @param pluginParams (ctxParamsType): Plugin configuration including model info.
 * @param selectedResolution (availableResolutions): Selected resolution for image generation if needed.
 *
 * Returns (Promise<unknown>): The parsed field value that matches the field's expected format.
 *
 * Process:
 * 1. Switch on the fieldType.
 * 2. For 'seo', parse JSON, then generate an image based on 'imagePrompt' if provided.
 * 3. For numeric fields (integer/float), convert to a number.
 * 4. For boolean, convert "1" to true and "0" to false.
 * 5. For map/color_picker, parse JSON objects.
 * 6. For 'json', return the string itself, assuming it's a valid JSON string.
 * 7. For default textual fields, return the string cleaned of quotes.
 */
const parseGptValue = async (
  fieldType: string,
  gptResponse: string,
  openai: OpenAI,
  datoKey: string,
  locale: string,
  pluginParams: ctxParamsType,
  selectedResolution: availableResolutions
) => {
  switch (fieldType) {
    case 'seo': {
      // SEO requires a JSON with title, description, and imagePrompt
      const returnedObject = await JSON.parse(gptResponse);
      const seoObject = {
        title: returnedObject.title,
        description: returnedObject.description,
        image: (
          await generateUploadOnPrompt(
            returnedObject.imagePrompt,
            openai,
            datoKey,
            locale,
            pluginParams.dallEModel,
            selectedResolution
          )
        )[0].upload_id,
        twitter_card: 'summary_large_image',
        no_index: false,
      };
      return seoObject;
    }

    case 'integer':
      return toNumber(gptResponse, false);

    case 'float':
      return toNumber(gptResponse, true);

    case 'boolean':
      return gptResponse.replace(/"/g, '') === '1';

    case 'map': {
      // Map expects a JSON with latitude/longitude
      const locationObject = await JSON.parse(gptResponse);
      return locationObject;
    }

    case 'color_picker': {
      // Color picker expects a JSON with red, green, blue, alpha
      const colorObject = await JSON.parse(gptResponse);
      return colorObject;
    }

    case 'json':
      // Return the raw JSON string (the caller presumably knows what to do with it)
      return gptResponse;

    default:
      // For any other field type, return the string stripped of quotes
      return gptResponse.replace(/"/g, '');
  }
};

export default parseGptValue;
