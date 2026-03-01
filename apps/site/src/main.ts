import "./styles.css";

const installCommand = "npm install -g based-lang";
const installCode = document.querySelector<HTMLElement>("#install-cmd");
const installButton = document.querySelector<HTMLButtonElement>("#copy-install");

if (!installCode || !installButton) {
  throw new Error("Missing marketing UI controls");
}

installCode.textContent = installCommand;

async function copy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

installButton.addEventListener("click", async () => {
  try {
    await copy(installCommand);
    installButton.textContent = "Copied";
  } catch {
    installButton.textContent = "Copy failed";
  }

  setTimeout(() => {
    installButton.textContent = "Copy Install Command";
  }, 1200);
});
