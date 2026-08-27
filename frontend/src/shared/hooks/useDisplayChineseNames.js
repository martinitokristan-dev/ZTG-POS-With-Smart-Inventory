import useSystemSettings from './useSystemSettings';

/**
 * Reads the `display_chinese_names` setting from useSystemSettings.
 * Returns true if chinese names should be shown, false if hidden.
 */
export default function useDisplayChineseNames() {
    const { display_chinese_names } = useSystemSettings();
    return display_chinese_names;
}
