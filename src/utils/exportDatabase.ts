import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const exportDatabase = async () => {
  try {
    const databasePath =
      `${FileSystem.documentDirectory}SQLite/sscboard.db`;

    const fileInfo =
      await FileSystem.getInfoAsync(
        databasePath,
      );

    if (!fileInfo.exists) {
      console.log(
        'Database file not found:',
        databasePath,
      );

      return;
    }

    const sharingAvailable =
      await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      console.log(
        'Sharing is not available on this device',
      );

      return;
    }

    await Sharing.shareAsync(
      databasePath,
      {
        mimeType:
          'application/x-sqlite3',
        dialogTitle:
          'Export SSC Board Database',
        UTI:
          'public.database',
      },
    );
  } catch (error) {
    console.error(
      'Error exporting database:',
      error,
    );
  }
};