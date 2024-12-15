import OpenAI from 'openai';
import generateUploadOnPrompt, {
  availableResolutions,
} from '../asset/generateUploadOnPrompt';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';

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
    case 'seo':
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
    case 'integer':
      return parseInt(gptResponse.replace(/"/g, ''));
    case 'float':
      return parseFloat(gptResponse.replace(/"/g, ''));
    case 'boolean':
      return gptResponse.replace(/"/g, '') === '1';
    case 'map':
      const locationObject = await JSON.parse(gptResponse);
      return locationObject;
    case 'color_picker':
      const colorObject = await JSON.parse(gptResponse);
      return colorObject;
    case 'json':
      return gptResponse;
    default:
      return gptResponse.replace(/"/g, '');
  }
};

export default parseGptValue;
