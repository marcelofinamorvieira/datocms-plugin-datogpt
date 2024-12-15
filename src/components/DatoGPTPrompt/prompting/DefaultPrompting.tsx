import classNames from 'classnames';
import {
  Button,
  TextField,
} from 'datocms-react-ui';
import { motion } from 'framer-motion';
import s from './styles.module.css';

type PropTypes = {
  handleGeneratePrompt: () => void;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  isImprove: boolean;
};

const DefaultPrompting = ({
  handleGeneratePrompt,
  prompt,
  setPrompt,
  isImprove,
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

      <Button
        onClick={() => {
          handleGeneratePrompt();
        }}
        buttonSize="xxs"
        buttonType="muted"
      >
        Prompt
      </Button>
      {/* {!isImprove && (
        <Button
          onClick={() => {
            handleGeneratePrompt();
          }}
          buttonSize="xxs"
          buttonType="muted"
        >
          Prompt with context
        </Button>
      )} TODO: CONSIDER */}
    </motion.div>
  );
};

export default DefaultPrompting;
