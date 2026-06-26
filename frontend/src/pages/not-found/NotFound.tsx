import NotFoundPageView from "./components/NotFoundPageView";
import { useNotFoundPage } from "./hooks/useNotFoundPage";

const NotFound = () => {
  const { missingPath, quickLinks, handleGoBack } = useNotFoundPage();

  return (
    <NotFoundPageView
      missingPath={missingPath}
      quickLinks={quickLinks}
      onGoBack={handleGoBack}
    />
  );
};

export default NotFound;
