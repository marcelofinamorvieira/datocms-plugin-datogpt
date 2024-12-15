import classNames from 'classnames';
import { Button } from 'datocms-react-ui';
import { AnimationControls, motion } from 'framer-motion';
import s from './styles.module.css';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import { Upload } from '../../../utils/generate/asset/generateUploadOnPrompt';
import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import handleGenerateAlt from '../../../utils/generate/alt/handleGenerateAlt';

type PropTypes = {
  setViewState: React.Dispatch<React.SetStateAction<string>>;
  ctx: RenderFieldExtensionCtx;
  pluginParams: ctxParamsType;
  controls: AnimationControls;
  fieldValue: unknown;
};

const MediaOptions = ({
  setViewState,
  ctx,
  fieldValue,
  pluginParams,
  controls,
}: PropTypes) => {
  return (
    <motion.div
      className={classNames(s.buttonsContainer)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {pluginParams.advancedSettings.mediaFieldsPermissions && (
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
      {pluginParams.advancedSettings.generateAlts &&
        ((!Array.isArray(fieldValue) &&
          typeof fieldValue === 'object' &&
          (fieldValue as Upload)?.upload_id) ||
          (!Array.isArray(fieldValue) &&
            typeof fieldValue === 'object' &&
            ((fieldValue as Record<string, unknown>)?.[ctx.locale] as Upload)
              ?.upload_id) ||
          (!Array.isArray(fieldValue) &&
            typeof fieldValue === 'object' &&
            ((fieldValue as Record<string, unknown>)?.[ctx.locale] as Upload[])
              ?.length > 0) ||
          (Array.isArray(fieldValue) && fieldValue.length > 0)) && (
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
                    | Upload //not localized
                    | Upload[]
                    | Record<string, Upload> //localized
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
