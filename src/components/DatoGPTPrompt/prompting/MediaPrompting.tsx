import classNames from 'classnames';
import {
  Button,
  CaretDownIcon,
  CaretUpIcon,
  Dropdown,
  DropdownMenu,
  DropdownOption,
  TextField,
} from 'datocms-react-ui';
import { motion } from 'framer-motion';
import s from './styles.module.css';
import { availableResolutions } from '../../../utils/generate/asset/generateUploadOnPrompt';
import { availableResolutionsArray } from '../../../entrypoints/Fields/DatoGPTPrompt';

type PropTypes = {
  handleGeneratePrompt: () => void;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  isGallery: Boolean;
  selectedResolution: string;
  setSelectedResolution: React.Dispatch<
    React.SetStateAction<availableResolutions>
  >;
};

const MediaPrompting = ({
  handleGeneratePrompt,
  prompt,
  setPrompt,
  isGallery,
  selectedResolution,
  setSelectedResolution,
}: PropTypes) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={classNames(s.promptBar)}
    >
      <div
        className={classNames(s.promptBar)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleGeneratePrompt();
          }
        }}
      >
        <TextField
          name="name"
          id="name"
          label=""
          value={prompt}
          placeholder="Write a prompt"
          onChange={(newValue) => setPrompt(newValue)}
        />
      </div>

      <div className={classNames(s.dropdown)}>
        <Dropdown
          renderTrigger={({ open, onClick }) => (
            <Button
              onClick={onClick}
              rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
            >
              {selectedResolution}
            </Button>
          )}
        >
          <DropdownMenu>
            {availableResolutionsArray.map((resolution) => {
              return (
                <DropdownOption
                  key={resolution}
                  onClick={() => {
                    setSelectedResolution(resolution);
                  }}
                >
                  {resolution}
                </DropdownOption>
              );
            })}
          </DropdownMenu>
        </Dropdown>
      </div>

      <Button
        onClick={() => {
          handleGeneratePrompt();
        }}
        buttonSize="l"
        buttonType="muted"
      >
        Prompt
      </Button>
    </motion.div>
  );
};

export default MediaPrompting;
