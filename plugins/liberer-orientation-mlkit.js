/**
 * Plugin de configuration : lève le verrou « portrait » de l'activité du scanner Google (ML Kit).
 *
 * Pourquoi : Google Play signale (« Supprimez les restrictions de redimensionnement et d'orientation »)
 * que `GmsBarcodeScanningDelegateActivity` est verrouillée en portrait. Cette activité est ajoutée par
 * une bibliothèque embarquée avec `expo-camera`, pas par notre code : on ne peut donc pas la régler dans
 * app.json. Elle ne s'ouvre jamais dans Proserpine (le scan passe par `CameraView`, voir scan.tsx),
 * mais on la déverrouille quand même pour que l'avertissement disparaisse.
 *
 * Comment : on déclare la même activité dans notre manifeste avec `tools:replace`. Seul l'attribut
 * `screenOrientation` est remplacé (par « unspecified » = le système décide) ; tout le reste de
 * l'activité vient toujours de la bibliothèque.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const ACTIVITE = 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';

module.exports = function libererOrientationMlkit(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifeste = cfg.modResults.manifest;
    // Le préfixe « tools » doit être déclaré sur la balise <manifest> pour être compris à la fusion.
    manifeste.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = manifeste.application?.[0];
    if (!application) return cfg;

    application.activity = application.activity ?? [];
    // Évite un doublon si le plugin est exécuté plusieurs fois.
    application.activity = application.activity.filter((a) => a.$['android:name'] !== ACTIVITE);
    application.activity.push({
      $: {
        'android:name': ACTIVITE,
        'android:screenOrientation': 'unspecified',
        'tools:replace': 'android:screenOrientation',
      },
    });
    return cfg;
  });
};
