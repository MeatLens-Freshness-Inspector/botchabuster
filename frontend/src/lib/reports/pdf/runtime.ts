export async function loadPdfMake() {
  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);

  pdfMake.vfs = pdfFonts.pdfMake.vfs;

  return pdfMake;
}
