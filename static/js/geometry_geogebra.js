let ggbApp;

export function initializeGeoGebra() {
  ggbApp = new GGBApplet(
    {
      appName: "classic",
      width: 600,
      height: 400,
      showToolBar: false,
      showAlgebraInput: false,
      showMenuBar: false,
      enableLabelDrags: false,
      enableShiftDragZoom: true,
      enableRightClick: false,
      showResetIcon: false,
      enableCAS: false,
      blockScripting: false,
      language: "fr",
    },
    true,
  );

  window.addEventListener("load", function () {
    ggbApp.inject("ggb-element");
  });
}

export async function loadImageIntoGeoGebra(imageFile) {
  if (window.ggbApplet && typeof window.ggbApplet.evalCommand === "function") {
    try {
      // Convert the image file to a base64 string
      const base64Image = await fileToBase64(imageFile);

      // Clear any existing constructions
      window.ggbApplet.reset();

      // Load the image using evalCommand
      window.ggbApplet.evalCommand(`ExerciseImage = Image(${base64Image})`);

      // Adjust the view to fit the image
      // window.ggbApplet.evalCommand("ZoomFit()");
    } catch (error) {
      console.error("Error loading image into GeoGebra:", error);
    }
  } else {
    console.error(
      "GeoGebra applet not initialized or evalCommand not available",
    );
  }
}

// Helper function to convert File to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}
