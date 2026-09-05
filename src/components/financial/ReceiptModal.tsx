import React, { useState } from "react";
import { X, Download, RefreshCw, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { FinancialInstallment, FinancialContract } from "./financialTypes";
import { formatBRL } from "./financialUtils";
import { Lead } from "../../types";
import { useToast } from "../Toast";

interface ReceiptModalProps {
  receiptData: {
    installment: FinancialInstallment;
    contract: FinancialContract;
    lead: Lead;
  };
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receiptData,
  onClose,
}) => {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const { installment, contract, lead } = receiptData;

  const handlePrintReceipt = async () => {
    const printContent = document.getElementById("print-receipt-modal");
    if (!printContent) {
      toast.error("Erro: Área de impressão não encontrada.");
      return;
    }

    try {
      setIsGeneratingPDF(true);
      toast.info("Gerando PDF do recibo...");

      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc, clonedElement) => {
          const styleTags = clonedDoc.querySelectorAll("style");
          styleTags.forEach((style) => {
            if (style.textContent) {
              style.textContent = style.textContent
                .replace(/oklch\([^)]+\)/gi, "rgba(0,0,0,0)")
                .replace(/color-mix\([^)]+\)/gi, "rgba(0,0,0,0)")
                .replace(/light-dark\([^)]+\)/gi, "rgba(0,0,0,0)");
            }
          });

          const applyExplicitStyles = (el: HTMLElement) => {
            const classList = Array.from(el.classList);
            if (classList.some((c) => c.startsWith("bg-zinc-50")))
              el.style.backgroundColor = "#fafafa";
            else if (classList.some((c) => c.startsWith("bg-zinc-100")))
              el.style.backgroundColor = "#f4f4f5";
            else if (classList.some((c) => c.startsWith("bg-zinc-900")))
              el.style.backgroundColor = "#18181b";
            else if (classList.some((c) => c.startsWith("bg-zinc-950")))
              el.style.backgroundColor = "#09090b";
            else if (classList.some((c) => c.startsWith("bg-white")))
              el.style.backgroundColor = "#ffffff";

            if (classList.some((c) => c.startsWith("text-zinc-950")))
              el.style.color = "#09090b";
            else if (classList.some((c) => c.startsWith("text-zinc-900")))
              el.style.color = "#18181b";
            else if (classList.some((c) => c.startsWith("text-zinc-800")))
              el.style.color = "#27272a";
            else if (classList.some((c) => c.startsWith("text-zinc-500")))
              el.style.color = "#71717a";
            else if (classList.some((c) => c.startsWith("text-zinc-400")))
              el.style.color = "#a1a1aa";
            else if (classList.some((c) => c.startsWith("text-amber-500")))
              el.style.color = "#f59e0b";
            else if (classList.some((c) => c.startsWith("text-white")))
              el.style.color = "#ffffff";

            if (classList.some((c) => c.startsWith("border-zinc-100")))
              el.style.borderColor = "#f4f4f5";
            else if (classList.some((c) => c.startsWith("border-zinc-200")))
              el.style.borderColor = "#e4e4e7";
            else if (classList.some((c) => c.startsWith("border-zinc-300")))
              el.style.borderColor = "#d4d4d8";
            else if (classList.some((c) => c.startsWith("border-zinc-800")))
              el.style.borderColor = "#27272a";
          };

          if (clonedElement) {
            clonedElement.style.backgroundColor = "#ffffff";
            clonedElement.style.color = "#09090b";
            clonedElement.style.padding = "32px";
            applyExplicitStyles(clonedElement);
            const children = clonedElement.querySelectorAll<HTMLElement>("*");
            children.forEach((child) => applyExplicitStyles(child));
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 5, pdfWidth, pdfHeight);

      const receiptNum = installment.receipt_number || "RECIBO";
      const leadNameClean = (lead.nome || "Lead").replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Recibo_${receiptNum}_${leadNameClean}.pdf`;

      pdf.save(fileName);
      toast.success("PDF do recibo baixado com sucesso!");

      try {
        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        iframe.style.visibility = "hidden";
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Recibo ${receiptNum}</title>
                <style>
                  body { background: white; margin: 0; padding: 20px; display: flex; justify-content: center; }
                  img { max-width: 100%; height: auto; }
                </style>
              </head>
              <body>
                <img src="${imgData}" />
                <script>
                  window.onload = function() {
                    try { window.print(); } catch(e) {}
                    setTimeout(function() {
                      try { window.frameElement.remove(); } catch(e) {}
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `);
          iframeDoc.close();
        }
      } catch (err) {
        // Fallback silently if iframe print not supported
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar recibo: " + (e?.message || "falha na renderização."));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white text-zinc-900 border border-zinc-200 rounded-2xl max-w-2xl w-full shadow-2xl relative flex flex-col justify-between max-h-[92vh] overflow-hidden">
        {/* Header controllers */}
        <div className="p-4 bg-zinc-100 border-b border-zinc-200 flex items-center justify-between z-10 print:hidden shrink-0">
          <span className="text-xs font-bold text-zinc-700 uppercase font-mono tracking-wide">
            Recibo Digital de Pagamento
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintReceipt}
              disabled={isGeneratingPDF}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              {isGeneratingPDF ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Imprimir / Baixar PDF</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area with elegant typography */}
        <div
          id="print-receipt-modal"
          className="p-6 md:p-10 overflow-y-auto font-sans text-sm space-y-6 print:p-0 print:overflow-visible bg-white text-zinc-950"
        >
          {/* Receipt Header with brand logo */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-zinc-800 pb-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center p-1.5 shrink-0">
                <img
                  src="/assets/logo.png"
                  alt="Casa Colombo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallbackText = document.getElementById(
                      "receipt-logo-fallback"
                    );
                    if (fallbackText) fallbackText.classList.remove("hidden");
                  }}
                />
                <span
                  id="receipt-logo-fallback"
                  className="hidden font-mono font-black text-[10px] text-amber-500 tracking-tighter uppercase"
                >
                  C.C.A
                </span>
              </div>
              <div>
                <h2 className="text-base font-bold font-mono tracking-wider text-zinc-900 uppercase">
                  Casa Colombo Artesanal
                </h2>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Lembranças Finas & Velas Aromáticas Personalizadas
                </p>
              </div>
            </div>

            {/* Receipt Number */}
            <div className="text-left sm:text-right font-mono">
              <span className="text-[9px] text-zinc-400 uppercase font-bold block">
                Recibo de Pagamento
              </span>
              <span className="text-sm font-bold text-zinc-900">
                {installment.receipt_number || "REC-000000"}
              </span>
            </div>
          </div>

          {/* Title Description */}
          <div className="text-center space-y-1">
            <h3 className="text-lg font-extrabold font-mono uppercase tracking-wider text-zinc-900">
              {installment.paid_value && installment.paid_value < installment.value
                ? "RECIBO DE PAGAMENTO PARCIAL"
                : "RECIBO DE PAGAMENTO"}
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Controle de Quitação de Lançamentos
            </p>
          </div>

          {/* Receipt Body content statement */}
          <div className="space-y-4 border border-zinc-200 p-6 rounded-xl bg-zinc-50 leading-relaxed text-zinc-800">
            <p>
              Recebemos de{" "}
              <strong className="text-zinc-950 font-bold">{lead.nome}</strong>
              {lead.local && (
                <span>
                  , residente em <strong>{lead.local}</strong>,
                </span>
              )}{" "}
              a importância líquida de:
            </p>

            {/* Grand numeric indicator */}
            <div className="text-center py-3 border-y border-zinc-200/80 my-2">
              <span className="text-2xl font-mono font-black text-zinc-950">
                {formatBRL(installment.paid_value || installment.value)}
              </span>
              <span className="block text-[10px] text-zinc-400 font-mono uppercase mt-1">
                Valor Recebido via {installment.payment_method || "Pix"}
              </span>
            </div>

            <p>
              Referente à quitação da{" "}
              <strong className="text-zinc-950">
                {installment.installment_number === 0
                  ? "Entrada"
                  : `${installment.installment_number}ª Parcela`}
              </strong>{" "}
              do contrato de prestação de serviços número{" "}
              <strong className="font-mono text-zinc-950">
                {contract.contract_number}
              </strong>
              , assinado em{" "}
              <strong>
                {new Date(
                  contract.contract_date + "T12:00:00"
                ).toLocaleDateString("pt-BR")}
              </strong>
              .
            </p>

            {/* Composição Financeira do Contrato */}
            <div className="mt-4 pt-3 border-t border-zinc-200/80 space-y-2">
              <span className="text-[10px] font-bold uppercase font-mono text-zinc-500 block tracking-wider">
                Composição e Controle do Contrato
              </span>
              <div className="bg-white border border-zinc-200 rounded-lg p-3 font-mono text-xs space-y-1.5">
                <div className="flex justify-between text-zinc-600">
                  <span>Valor dos Produtos/Serviços:</span>
                  <span className="font-medium text-zinc-900">
                    {formatBRL(contract.total_value)}
                  </span>
                </div>
                {(contract.freight_value ?? 0) > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>(+) Valor do Frete:</span>
                    <span className="font-medium text-zinc-900">
                      +{formatBRL(contract.freight_value || 0)}
                    </span>
                  </div>
                )}
                {(contract.discount_value ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>(-) Desconto Concedido:</span>
                    <span className="font-bold text-emerald-700">
                      -{formatBRL(contract.discount_value || 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-zinc-950 pt-1.5 border-t border-zinc-200 text-xs">
                  <span>(=) Valor Líquido Total do Contrato:</span>
                  <span>
                    {formatBRL(
                      contract.final_value ??
                        contract.total_value +
                          (contract.freight_value || 0) -
                          (contract.discount_value || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {installment.payment_observations && (
              <p className="text-xs text-zinc-500 italic mt-3 border-l-2 border-zinc-300 pl-3">
                Observação: {installment.payment_observations}
              </p>
            )}
          </div>

          {/* Metadata details (Dates, Signatures) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase font-mono text-zinc-400 block">
                Cidade e Data de Emissão
              </span>
              <span className="text-zinc-800 font-medium font-mono text-xs">
                São Vicente,{" "}
                {installment.paid_date
                  ? new Date(
                      installment.paid_date + "T12:00:00"
                    ).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : new Date().toLocaleDateString("pt-BR")}
              </span>
            </div>

            <div className="text-center space-y-2 sm:border-l sm:border-zinc-100 sm:pl-6">
              <div className="pt-4 border-t border-zinc-300">
                <span className="text-xs font-bold font-mono text-zinc-800 block">
                  CASA COLOMBO ARTESANAL
                </span>
                <span className="text-[9px] text-zinc-400 italic block mt-1">
                  Este recibo é válido como comprovante por chancela eletrônica
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer informational row */}
        <div className="p-3.5 bg-zinc-50 border-t border-zinc-200 text-center text-[10px] text-zinc-400 shrink-0 print:hidden">
          Recibo timbrado com validade digital gerado pelo CRM Casa Colombo Artesanal.
        </div>
      </div>
    </div>
  );
};
