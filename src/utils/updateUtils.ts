import packageJson from '../../package.json';

interface VersionInfo {
    hasUpdate: boolean;
    latestVersion: string;
    currentVersion: string;
    downloadUrl: string;
    releaseNotes?: string;
    forceUpdate?: boolean;
}

const LANDING_PAGE_BASE_URL = 'https://shamelapp.com';
const VERSION_FILE_URL = `${LANDING_PAGE_BASE_URL}/version.json`;

/**
 * Compare two semver strings.
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
export const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }

    return 0;
};

export const checkForUpdate = async (): Promise<VersionInfo> => {
    // Skip update check in development to avoid 404 errors and annoying dialogs
    if (import.meta.env.DEV) {
        console.log('Skipping update check in local development');
        return {
            hasUpdate: false,
            latestVersion: packageJson.version,
            currentVersion: packageJson.version,
            downloadUrl: '',
            releaseNotes: '',
            forceUpdate: false
        };
    }

    try {
        const currentVersion = packageJson.version;

        // Fetch remote version file with cache busting query param
        const response = await fetch(`${VERSION_FILE_URL}?t=${new Date().getTime()}`, {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch version info: ${response.statusText}`);
        }

        const remoteData = await response.json();

        const latestVersion = remoteData.version;
        const downloadUrl = remoteData.downloadUrl || 'https://muslim1972.github.io/shamil-landing-page/'; // Fallback
        const releaseNotes = remoteData.releaseNotes || 'إصلاحات وتحسينات عامة.';
        const forceUpdate = remoteData.forceUpdate || false;

        const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

        console.log('🔄 Update Check:', {
            current: currentVersion,
            latest: latestVersion,
            hasUpdate,
            url: downloadUrl,
            forceUpdate
        });

        return {
            hasUpdate,
            latestVersion,
            currentVersion,
            downloadUrl,
            releaseNotes,
            forceUpdate
        };
    } catch (error) {
        console.error('Error checking for updates:', error);
        return {
            hasUpdate: false,
            latestVersion: '0.0.0',
            currentVersion: packageJson.version,
            downloadUrl: ''
        };
    }
};
