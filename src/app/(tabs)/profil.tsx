/**
 * PROFIL — reproduit `pages/profil.html` + `js/pages/profil.js` :
 * en-tête sombre avec le pseudo et le bouton de déconnexion, menu « Mon activité »
 * et « Mon compte », et — sur le web seulement — l'installation de l'application (PWA).
 *
 * Comme en ligne, « Modifier mes informations » et « Paramètres » mènent à la page
 * « Fonctionnalité en cours de développement ».
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EnteteBoutonDanger, EnteteSombre } from '@/components/ui/entete-sombre';
import { useUi } from '@/components/ui/ui-provider';
import { useAuth } from '@/contexts/auth';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { logoutUser } from '@/services/auth';
import { getUsername } from '@/services/user';

/** Une ligne de menu (`.menu-item`). */
function LigneMenu({ icone, libelle, droite, onPress }: { icone: string; libelle: string; droite?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menu, pressed && { backgroundColor: couleurs.fondGris }]}
    >
      <View style={styles.menuGauche}>
        <Icone nom={icone} taille={24} couleur={couleurs.marque} />
        <Text style={styles.menuLibelle}>{libelle}</Text>
      </View>
      <Icone nom={droite ?? 'chevron_right'} taille={24} couleur={couleurs.texteDiscret} />
    </Pressable>
  );
}

export default function ProfilScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const ui = useUi();
  const [pseudo, setPseudo] = useState('Chargement...');

  // --- Installation de la PWA (web uniquement) ---
  const [invite, setInvite] = useState<any>(null); // l'événement « beforeinstallprompt »
  const [aideIos, setAideIos] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const dejaInstallee =
      window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (dejaInstallee) return;

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      // iOS : pas d'invite automatique, on affiche l'explication manuelle.
      setAideIos(true);
      return;
    }
    const surInvite = (e: any) => {
      e.preventDefault();
      setInvite(e);
    };
    const surInstallee = () => setInvite(null);
    window.addEventListener('beforeinstallprompt', surInvite);
    window.addEventListener('appinstalled', surInstallee);
    return () => {
      window.removeEventListener('beforeinstallprompt', surInvite);
      window.removeEventListener('appinstalled', surInstallee);
    };
  }, []);

  const installer = async () => {
    if (!invite) return;
    invite.prompt();
    const { outcome } = await invite.userChoice;
    if (outcome === 'accepted') setInvite(null);
  };

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      if (user) getUsername(user.uid, user.displayName).then((n) => actif && setPseudo(n));
      return () => {
        actif = false;
      };
    }, [user]),
  );

  const deconnecter = () =>
    ui.confirmer({
      titre: 'Déconnexion',
      message: 'Vous êtes sur le point de vous déconnecter. Confirmer ?',
      confirmer: 'Se déconnecter',
      annuler: 'Annuler',
      danger: true,
      onConfirmer: async () => {
        const r = await logoutUser();
        if (!r.success) ui.toast('Erreur de déconnexion', 'error');
      },
    });

  const indisponible = () => router.push('/indisponible');

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 16 }}>
      <EnteteSombre
        action={
          <EnteteBoutonDanger onPress={deconnecter}>
            <Icone nom="logout" taille={24} couleur="#E74C3C" />
          </EnteteBoutonDanger>
        }
      >
        {/* .header-dark-profile */}
        <View style={styles.profil}>
          <Text style={styles.pseudo}>{pseudo}</Text>
        </View>
      </EnteteSombre>

      <Text style={styles.sectionTitre}>Mon activité</Text>
      <View style={styles.liste}>
        <LigneMenu icone="history" libelle="Historique de recherches" onPress={() => router.push('/historique')} />
      </View>

      <Text style={styles.sectionTitre}>Mon compte</Text>
      <View style={styles.liste}>
        <LigneMenu icone="edit_document" libelle="Modifier mes informations" onPress={indisponible} />
        <LigneMenu icone="tune" libelle="Paramètres" onPress={indisponible} />
      </View>

      {invite ? (
        <>
          <Text style={styles.sectionTitre}>Application</Text>
          <View style={styles.liste}>
            <LigneMenu icone="install_mobile" libelle="Installer l'application" droite="download" onPress={installer} />
          </View>
        </>
      ) : null}

      {aideIos ? (
        <>
          <Text style={styles.sectionTitre}>Application</Text>
          <View style={styles.aideIos}>
            <Icone nom="ios_share" taille={24} couleur={couleurs.marque} />
            <Text style={styles.aideIosTexte}>
              Pour installer l'app, appuyez sur <Text style={{ fontFamily: police.gras }}>Partager</Text> puis{' '}
              <Text style={{ fontFamily: police.gras }}>"Sur l'écran d'accueil"</Text>.
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  profil: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 8 },
  // .username-title
  pseudo: { flex: 1, fontFamily: police.extraGras, fontSize: tailleTexte.xl2, color: '#FFFFFF', textAlign: 'center' },
  // .profile-section-title
  sectionTitre: {
    fontFamily: police.extraGras,
    fontSize: tailleTexte.md,
    color: couleurs.texteAttenue,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  // .profile-menu
  liste: { marginHorizontal: 16, marginBottom: 24, gap: 12 },
  // .menu-item
  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    padding: 16,
  },
  menuGauche: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuLibelle: { fontFamily: police.semiGras, fontSize: tailleTexte.md, color: couleurs.texte },
  // .install-ios-hint
  aideIos: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  aideIosTexte: { flex: 1, fontFamily: police.normal, fontSize: tailleTexte.md, lineHeight: 21, color: couleurs.texte },
});
