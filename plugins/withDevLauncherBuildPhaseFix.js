const { withXcodeProject } = require('expo/config-plugins');

const BUILD_PHASE_NAME = '[Expo Dev Launcher] Strip Local Network Keys for Release';

/** Silence Xcode "ambiguous dependencies" warning for expo-dev-launcher's plist strip script. */
function withDevLauncherBuildPhaseFix(config) {
  return withXcodeProject(config, (config) => {
    const phases = config.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};

    for (const key of Object.keys(phases)) {
      if (key.endsWith('_comment')) {
        continue;
      }

      const phase = phases[key];
      const name = typeof phase.name === 'string' ? phase.name.replace(/^"|"$/g, '') : '';

      if (name !== BUILD_PHASE_NAME) {
        continue;
      }

      phase.alwaysOutOfDate = 1;
    }

    return config;
  });
}

module.exports = withDevLauncherBuildPhaseFix;
