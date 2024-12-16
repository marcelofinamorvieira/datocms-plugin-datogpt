//********************************************************************************************
// MediaOptions.tsx
//
// This component renders action buttons related to media fields (file or gallery).
//
//********************************************************************************************

import classNames from 'classnames';
import { Button } from 'datocms-react-ui';
import { AnimationControls, motion } from 'framer-motion';
import s from './styles.module.css';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import { Upload } from '../../../utils/generate/asset/generateUploadOnPrompt';
import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import handleGenerateAlt from '../../../utils/generate/alt/handleGenerateAlt';

//--------------------------------------------------------------------------------------------
// PropTypes: Defines the shape of the props this component expects.
//
// setViewState: React state setter function for the current UI view state.
// ctx:          DatoCMS field extension context object.
// pluginParams: Plugin configuration parameters.
// controls:     AnimationControls for UI animations.
// fieldValue:   The current field value (media item/s).
//
//--------------------------------------------------------------------------------------------
type PropTypes = {
  setViewState: React.Dispatch<React.SetStateAction<string>>;
  ctx: RenderFieldExtensionCtx;
  pluginParams: ctxParamsType;
  controls: AnimationControls;
  fieldValue: unknown;
};

//--------------------------------------------------------------------------------------------
// canGenerateAlt: Helper function to determine if the "Generate Alt" button should be displayed.
//
// Logic:
// - Checks if alt generation is enabled via plugin params.
// - Ensures there's at least one image upload_id present in the fieldValue.
// - Handles localized and array-based values gracefully.
//
// Returns true if alt text generation is possible; false otherwise.
//--------------------------------------------------------------------------------------------
function canGenerateAlt(
  fieldValue: unknown,
  ctx: RenderFieldExtensionCtx,
  pluginParams: ctxParamsType
): boolean {
  if (!pluginParams.advancedSettings.generateAlts) return false;

  // If it's a single upload, check if upload_id exists
  if (
    !Array.isArray(fieldValue) &&
    typeof fieldValue === 'object' &&
    (fieldValue as Upload)?.upload_id
  ) {
    return true;
  }

  // If it's localized single upload
  if (!Array.isArray(fieldValue) && typeof fieldValue === 'object') {
    const localizedUpload = (fieldValue as Record<string, unknown>)?.[
      ctx.locale
    ] as Upload | Upload[] | undefined;
    if (
      localizedUpload &&
      !Array.isArray(localizedUpload) &&
      localizedUpload.upload_id
    ) {
      return true;
    }

    if (Array.isArray(localizedUpload) && localizedUpload.length > 0) {
      return true;
    }
  }

  // If it's an array of uploads
  if (Array.isArray(fieldValue) && fieldValue.length > 0) {
    return true;
  }

  return false;
}

//--------------------------------------------------------------------------------------------
// MediaOptions Component
//
// This component shows actions for media fields, such as generating a new image or alt text.
//
// Logic:
// - If media field generation is allowed (mediaFieldsPermissions is true), show the "Prompt to generate a new image" button.
// - If alt generation is enabled and possible, show the "Generate Alt" button.
//
//--------------------------------------------------------------------------------------------
const MediaOptions = ({
  setViewState,
  ctx,
  fieldValue,
  pluginParams,
  controls,
}: PropTypes) => {
  const allowMediaGeneration =
    pluginParams.advancedSettings.mediaFieldsPermissions;
  const showAltButton = canGenerateAlt(fieldValue, ctx, pluginParams);

  return (
    <motion.div
      className={classNames(s.buttonsContainer)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/* Button to generate a new image, if allowed */}
      {allowMediaGeneration && (
        <div key="prompting-button" className={classNames(s.buttonsContainer)}>
          <Button
            onClick={() => {
              setViewState('collapsed');
              setTimeout(() => {
                setViewState('prompting');
              }, 250);
            }}
            buttonSize="xxs"
            buttonType="muted"
          >
            Prompt to generate a new image
          </Button>
        </div>
      )}

      {/* Button to generate alt text if it's enabled and possible */}
      {showAltButton && (
        <div key="improve-button" className={classNames(s.buttonsContainer)}>
          <Button
            buttonSize="xxs"
            buttonType="muted"
            onClick={() => {
              handleGenerateAlt(
                ctx,
                setViewState,
                controls,
                fieldValue as
                  | Upload
                  | Upload[]
                  | Record<string, Upload>
                  | Record<string, Upload[]>,
                pluginParams
              );
            }}
          >
            Generate Alt
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default MediaOptions;
