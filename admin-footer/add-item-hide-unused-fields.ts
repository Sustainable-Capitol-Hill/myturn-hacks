// When cataloguing new donations into inventory, hide the MyTurn fields that
// our tool library has/would/will never use. This makes the form less
// daunting, verbose, and error-prone, especially for newer volunteers.

if (window.location.pathname === '/library/orgInventory/create') {
    document.addEventListener("DOMContentLoaded", function () {
        const FIELDS_TO_HIDE = [
            // `Basics` section
            'Featured',
            // `More` section
            'Serial Number',
            'Condition',
            'Eco Rating',
            'Embodied Carbon',
            'Emission Factor',
            // `Loans & Money` section
            'Daily Late Fee',
            'Grace period on late fees (in days)',
            'Tax(es)',
            'Source / Supplier'
        ];

        FIELDS_TO_HIDE.forEach(function (fieldLabelText) {
            // Use an XPath query to find the form field node that we're trying
            // to hide
            const nodesSnaphot = document.evaluate(
                `//label[@class="control-label" and text()="${fieldLabelText}"]//ancestor::div[@class="form-group"]`,
                document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            )

            if (
                nodesSnaphot.snapshotLength === 0 ||
                nodesSnaphot.snapshotLength > 1
            ) {
                // We don't expect zero or multiple matches, so if we encounter
                // them we should not do anything to this element
                return;
            }

            const nodeToHide = nodesSnaphot.snapshotItem(0) as HTMLElement;
            // Can't delete the node, because it must be present in the
            // HTML form submission. But we can hide it.
            nodeToHide.style.display = 'none';
        });

        // Finally, trigger MyTurn's janky JavaScript to recalculate the height
        // of its content and update the `style.height` attribute on the
        // (`absolute`ly-positioned) content. Otherwise, there will be a big
        // blank gap between the form fields and the submit buttons. This is
        // only necessary on desktop-width layouts.
        window.dispatchEvent(new Event('resize'));
    });
}
