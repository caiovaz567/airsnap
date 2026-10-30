import { Block, Button, List, ListItem, Page } from "konsta/react";
import { AirVent, MonitorSmartphone, ShieldCheck, TriangleAlert, Zap } from "lucide-react";

const FEATURES = [
  { icon: AirVent, title: "Controle na hora", text: "Liga, desliga, temperatura, modo e ventilação" },
  { icon: Zap, title: "Gasto em reais", text: "Quanto o ar gastou hoje, no mês e a previsão da conta" },
  { icon: MonitorSmartphone, title: "Celular e PC", text: "Instale no iPhone ou use no navegador" },
  { icon: ShieldCheck, title: "Seu token protegido", text: "Guardado criptografado. Você apaga quando quiser" },
];

export function Welcome({ onSignUp, onSignIn }: { onSignUp: () => void; onSignIn: () => void }) {
  return (
    <Page>
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center py-10">
        <div className="mb-6 flex flex-col items-center gap-3 px-6 text-center">
          <img src="/logo.png" alt="AirSnap" className="h-28 w-28 drop-shadow-[0_8px_24px_rgba(56,189,248,0.35)]" />
          <h1 className="text-4xl font-bold">AirSnap</h1>
          <p className="opacity-70">O seu ar-condicionado LG, rápido e sem loading infinito.</p>
        </div>

        <div className="mx-4 mb-6 flex gap-3 rounded-2xl bg-amber-400/15 p-4 text-sm text-amber-300">
          <TriangleAlert size={20} className="mt-0.5 shrink-0" />
          <p>
            <b>Só funciona com ar-condicionado LG</b> que já está conectado ao app <b>LG ThinQ</b> (com Wi-Fi).
          </p>
        </div>

        <List strong inset className="!my-0">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <ListItem key={title} title={title} text={text} media={<Icon size={24} className="text-primary" />} />
          ))}
        </List>

        <Block className="!my-6 flex flex-col gap-3">
          <Button large rounded onClick={onSignUp}>
            Criar conta
          </Button>
          <Button large rounded outline onClick={onSignIn}>
            Voltar
          </Button>
        </Block>

        <p className="px-8 text-center text-sm text-white/60">
          AirSnap não é um app oficial da LG. LG e LG ThinQ são marcas da LG Electronics.
        </p>
      </div>
    </Page>
  );
}
