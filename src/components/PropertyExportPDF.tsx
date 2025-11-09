import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PropertyExportPDFProps {
  property: any;
  agent: any;
}

export const PropertyExportPDF = ({ property, agent }: PropertyExportPDFProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Ficha de Propiedad", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;

      // Property Title
      doc.setFontSize(16);
      doc.text(property.title, 20, yPosition);
      yPosition += 10;

      // Price
      doc.setFontSize(14);
      doc.setTextColor(0, 100, 200);
      doc.text(formatPrice(property.price), 20, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;

      // Location
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${property.address}, ${property.municipality}, ${property.state}`,
        20,
        yPosition
      );
      yPosition += 15;

      // Property Details Table
      const detailsData = [
        ["Tipo", property.type],
        ["Operación", property.listing_type === "venta" ? "Venta" : "Renta"],
        ...(property.bedrooms ? [["Recámaras", property.bedrooms.toString()]] : []),
        ...(property.bathrooms ? [["Baños", property.bathrooms.toString()]] : []),
        ...(property.parking ? [["Estacionamientos", property.parking.toString()]] : []),
        ...(property.sqft ? [["m² Construidos", property.sqft.toString()]] : []),
        ...(property.lot_size ? [["m² Terreno", property.lot_size.toString()]] : []),
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [["Característica", "Valor"]],
        body: detailsData,
        theme: "grid",
        headStyles: { fillColor: [0, 100, 200] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Description
      if (property.description) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Descripción", 20, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const splitDescription = doc.splitTextToSize(
          property.description,
          pageWidth - 40
        );
        doc.text(splitDescription, 20, yPosition);
        yPosition += splitDescription.length * 5 + 10;
      }

      // Agent Info
      if (agent) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Información del Agente", 20, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Nombre: ${agent.name}`, 20, yPosition);
        yPosition += 6;

        if (agent.phone) {
          doc.text(`Teléfono: ${agent.phone}`, 20, yPosition);
          yPosition += 6;
        }

        if (agent.email) {
          doc.text(`Email: ${agent.email}`, 20, yPosition);
          yPosition += 6;
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generado el ${new Date().toLocaleDateString("es-MX")}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save PDF
      doc.save(`propiedad-${property.id}.pdf`);
      toast.success("PDF generado exitosamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={exportToPDF}
      disabled={isExporting}
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar PDF
        </>
      )}
    </Button>
  );
};
