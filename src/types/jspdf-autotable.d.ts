// Declaración de tipos para jspdf-autotable
import 'jspdf'

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
    autoTable: (options: any) => jsPDF
  }
}
