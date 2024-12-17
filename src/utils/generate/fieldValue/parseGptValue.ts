//********************************************************************************************
// parseGptValue.ts
//
// This file parses the raw OpenAI response for a given field type into a final value suitable
// for storing in DatoCMS. Different field types require specific transformations.
//
// Key responsibilities:
// 1. Based on the fieldType, interpret the GPT response string and convert it into the correct format.
// 2. For SEO fields, parse a JSON object with title, description, and imagePrompt. If seoGenerateAsset
//    is enabled in advancedSettings, generate a new asset using generateUploadOnPrompt; otherwise, do not.
//
// Field Type Handling:
// - 'seo': Expects a JSON with {title, description, imagePrompt}.
//   * If seoGenerateAsset = true, generate an asset from imagePrompt and assign it to seoObject.image.
//   * If seoGenerateAsset = false, do not generate the asset, image will be null.
// - 'integer'/'float': Parse numeric strings.
// - 'boolean': Convert "1" to true and "0" to false.
// - 'map', 'color_picker', 'json': Parse JSON directly.
// - For default text fields, return a cleaned string.
// - If fieldType is unknown or no special handling required, return the raw string (minus quotes).
//
// Comments provided from scratch, covering the whole file.
//********************************************************************************************

import OpenAI from 'openai';
import generateUploadOnPrompt, {
  availableResolutions,
} from '../asset/generateUploadOnPrompt';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';

//-------------------------------------------
// Helper function: toNumber
//
// Converts a string to a number, either integer or float.
// If isFloat = false, uses parseInt.
// If isFloat = true, uses parseFloat.
// Removes quotes before parsing.
//-------------------------------------------
function toNumber(value: string, isFloat = false) {
  const cleaned = value.replace(/"/g, '');
  return isFloat ? parseFloat(cleaned) : parseInt(cleaned);
}

//-------------------------------------------
// parseGptValue
//
// Given a fieldType and gptResponse (string from OpenAI), this function
// parses the gptResponse into the appropriate JavaScript value for that field.
//
// Parameters:
// - fieldType: string representing the field type (e.g. 'seo', 'integer').
// - gptResponse: string returned by GPT.
// - openai: OpenAI client instance.
// - datoKey: DatoCMS API token.
// - locale: current locale.
// - pluginParams: configuration parameters including advancedSettings and prompts.
// - selectedResolution: resolution to use if image generation is needed.
//
// Returns: A promise that resolves to the final value for the field.
//
// Steps for SEO fields:
// 1. Parse the returned JSON.
// 2. If `seoGenerateAsset` is true, generate an image from imagePrompt.
// 3. If `seoGenerateAsset` is false, do not generate an asset, set image to null.
//-------------------------------------------
const parseGptValue = async (
  fieldType: string,
  gptResponse: string,
  openai: OpenAI,
  datoKey: string,
  locale: string,
  pluginParams: ctxParamsType,
  selectedResolution: availableResolutions
): Promise<unknown> => {
  switch (fieldType) {
    case 'seo': {
      // SEO fields expect a JSON with title, description, and imagePrompt.
      const returnedObject = await JSON.parse(gptResponse);
      const seoObject = {
        title: returnedObject.title,
        description: returnedObject.description,
        // Here we decide whether to generate the image asset or not.
        image: null as string | null,    // Default null, will assign if we generate.
        twitter_card: 'summary_large_image',
        no_index: false,
      };

      // Check if we should generate a new asset for SEO:
      if (pluginParams.advancedSettings.seoGenerateAsset) {
        // If true, generate an asset using imagePrompt
        const uploads = await generateUploadOnPrompt(
          returnedObject.imagePrompt,
          openai,
          datoKey,
          locale,
          pluginParams.dallEModel,
          selectedResolution
        );
        seoObject.image = uploads[0].upload_id; // Assign the generated asset ID
      } else {
        // If not generating asset, image stays null
        seoObject.image = null;
      }

      return seoObject;
    }

    case 'integer':
      // Convert the GPT response to an integer
      return toNumber(gptResponse, false);

    case 'float':
      // Convert the GPT response to a float
      return toNumber(gptResponse, true);

    case 'boolean':
      // Convert "0" or "1" to boolean values
      return gptResponse.replace(/"/g, '') === '1';

    case 'map':
      // Parse a JSON string as an object with latitude/longitude fields
      return await JSON.parse(gptResponse);

    case 'color_picker':
      // Parse a JSON string as an object with red, green, blue, alpha
      return await JSON.parse(gptResponse);

    case 'json':
      // Return the JSON string as-is (caller presumably handles it)
      return gptResponse;

    default:
      // For textual fields or unknown types, just remove quotes and return
      return gptResponse.replace(/"/g, '');
  }
};

export default parseGptValue;