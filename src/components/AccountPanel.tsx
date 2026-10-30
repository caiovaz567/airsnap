import { useState } from "react";
import { BlockFooter, List, ListButton, ListItem } from "konsta/react";
import { Globe, KeyRound, Mail } from "lucide-react";
import { deleteAccount, disconnectAccount } from "../lib/api.ts";
import { countryName } from "../lib/countries.ts";

export interface AccountActions {
  email: string;
  country: string | null;
  onReconnect: () => void;
  onSignOut: () => void;
}

export function AccountPanel({ email, country, onReconnect, onSignOut }: AccountActions) {
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const run = async (action: () => Promise<unknown>, after: () => void) => {
    setWorking(true);
    setError(null);
    try {
      await action();
      after();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setWorking(false);
    }
  };

  const disconnect = () => {
    if (window.confirm("Desconectar sua conta LG? O token será apagado do AirSnap.")) run(disconnectAccount, onReconnect);
  };

  const remove = () => {
    if (window.confirm("Excluir sua conta do AirSnap? Isso apaga seu login e seu token LG. Não dá pra desfazer.")) {
      run(deleteAccount, onSignOut);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="mx-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <List strong inset className="!my-0">
        <ListItem title="E-mail" after={email} media={<Mail size={22} className="text-primary" />} />
        <ListItem title="País da LG" after={countryName(country)} media={<Globe size={22} className="text-primary" />} />
        <ListItem link title="Trocar token LG" media={<KeyRound size={22} className="text-primary" />} onClick={onReconnect} />
      </List>

      <section>
        <List strong inset className="!my-0">
          <ListButton onClick={onSignOut}>Sair</ListButton>
          <ListButton onClick={working ? undefined : disconnect} colors={{ textIos: "text-red-500", textMaterial: "text-red-500" }}>
            Desconectar conta LG
          </ListButton>
          <ListButton onClick={working ? undefined : remove} colors={{ textIos: "text-red-500", textMaterial: "text-red-500" }}>
            Excluir minha conta
          </ListButton>
        </List>
        <BlockFooter className="!mt-2">AirSnap não é um app oficial da LG.</BlockFooter>
      </section>
    </div>
  );
}
