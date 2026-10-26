/** Shared title block for worker dashboard sections. */
const WorkerPageHeader = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <div className="mb-4 md:mb-5">
    <h1 className="app-page-title">{title}</h1>
    {description ? <p className="app-page-description">{description}</p> : null}
  </div>
);

export default WorkerPageHeader;
