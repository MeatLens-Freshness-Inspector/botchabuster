export async function loadPdfMake() {
  const [{ default: pdfMake }, pdfFontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);

  const fontContainer =
    pdfFontsModule.default ??
    pdfFontsModule["module.exports"] ??
    pdfFontsModule.pdfMake?.vfs;
  const fontVfs =
    fontContainer && typeof fontContainer === "object" && "vfs" in fontContainer
      ? fontContainer.vfs
      : fontContainer;

  if (fontVfs) {
    if (typeof pdfMake.addVirtualFileSystem === "function") {
      pdfMake.addVirtualFileSystem(fontVfs);
    } else {
      pdfMake.vfs = fontVfs;
    }
  }

  return pdfMake;
}
