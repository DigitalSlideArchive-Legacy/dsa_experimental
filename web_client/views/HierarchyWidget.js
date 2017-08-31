/* This add a ThumbnailWidget and modifies the HierarchyWidget */

import HierarchyWidget from 'girder/views/widgets/HierarchyWidget';
import ItemCollection from 'girder/collections/ItemCollection';
import LoadingAnimation from 'girder/views/widgets/LoadingAnimation';
import View from 'girder/views/View';
import { wrap } from 'girder/utilities/PluginUtils';
import { apiRoot } from 'girder/rest';

import '../stylesheets/thumbnailWidget.styl';

import ThumbnailWidgetTemplate from '../templates/thumbnailWidget.pug';

var ThumbnailWidget = View.extend({
    events: {
        'click a.dsa-item-grid-link': function (event) {
            var cid = $(event.currentTarget).attr('g-item-cid');
            this.trigger('g:itemClicked', this.collection.get(cid), event);
        },
        'click a.g-show-more-items': function () {
            this.collection.fetchNextPage();
        }
    },

    initialize: function (settings) {
        this.parentModel = settings.parentModel;
        if (this.parentModel.resourceName !== 'folder') {
            delete this.collection;
            return;
        }

        this.accessLevel = this.parentModel.getAccessLevel();
        this.public = this.parentModel.get('public');

        new LoadingAnimation({
            el: this.$el,
            parentView: this
        }).render();

        this.collection = new ItemCollection();
        this.collection.append = true;  // Append, don't replace pages
        this.collection.filterFunc = settings.itemFilter;
        this.collection.on('g:changed', function () {
            if (this.accessLevel !== undefined) {
                this.collection.each((model) => {
                    model.set('_accessLevel', this.accessLevel);
                });
            }
            this.render();
            this.trigger('g:changed');
        }, this).fetch({ folderId: this.parentModel.id });
    },

    render: function () {
        this.$el.html(ThumbnailWidgetTemplate({
            items: this.collection.toArray(),
            apiRoot: apiRoot,
            isParentPublic: this.public,
            hasMore: this.collection.hasNextPage()
        }));
        return this;
    }
});

wrap(HierarchyWidget, 'render', function (render) {
    render.call(this);
    /* Don't show the thumbnails unless we are also show the action bar. */
    if (this._showActions) {
        if (!this.$('.g-item-thumbnail-container').length) {
            this.$('.g-hierarchy-actions-header').before($('<div>').addClass('g-item-thumbnail-container'));
        }
        if (!this.thumbnailWidget) {
            this.thumbnailWidget = new ThumbnailWidget({
                parentModel: this.parentModel,
                itemFilter: this._itemFilter,
                parentView: this
            });
            this.listenTo(this.thumbnailWidget, 'g:itemClicked', this._onItemClick);
        }
        this.thumbnailWidget.setElement(this.$('.g-item-thumbnail-container'));
    }
    return this;
});

wrap(HierarchyWidget, 'setCurrentModel', function (setCurrentModel, parent, opts) {
    if (this.thumbnailWidget) {
        this.thumbnailWidget.initialize({
            parentModel: parent,
            itemFilter: this._itemFilter
        });
    }
    return setCurrentModel.call(this, parent, opts);
});
