/**
 * rCrumbs - jQuery plugin
 * https://github.com/cm0s/jquery-rcrumbs
 *
 * Copyright (c) 2013 Nicolas Forney.
 * Distributed under the terms of the MIT license.
 */

(function ($, window, document, undefined) {
    "use strict";

    var rcrumbs = 'rcrumbs',
        defaults = {
            callback: {
                preCrumbsListDisplay: $.noop, //A function which is executed before the crumbs list is rendered
                preCrumbDisplay: $.noop, //A function which is executed before each crumb is rendered
                postCrumbsListDisplay: $.noop, //A function which is executed after the crumbs list is rendered
                postCrumbDisplay: $.noop //A function which is executed after each crumb is rendered
            },
            ellipsis: true, // Activate ellipsis when only the last crumb remains with not enough space to be displayed
            animation: {
                activated: true, // Activate an animation when crumbs are displayed/hidden on a window resize
                speed: 400 // Animation speed (activated option must be set to true)
            }
        };

    // Plugin constructor
    function Plugin(element, options) {

        this.element = element;
        this.$element = $(element);

        //Merge defaults with given  (use deep copy)
        this.options = $.extend(true, {}, defaults, options);

        this._defaults = defaults;
        this._name = rcrumbs;

        this.init();
    }

    Plugin.prototype = {
        init: function () {
            //Ensure rcrumbs class is defined on the element in order to be able to correctly apply stylesheets
            if (!this.$element.hasClass('rcrumbs')) {
                this.$element.addClass('rcrumbs');
            }

            //Variables declaration
            this.nbCrumbDisplayed = 0;
            this.$crumbsList = $('ul', this.element);
            this.$crumbs = $('li', this.$crumbsList);
            this.reversedCrumbs = $('li', this.$crumbsList).get().reverse();
            this.lastNbCrumbDisplayed = 0;
            this.totalCrumbsWidth = 0;

            this.initCrumbs();
            this.showOrHideCrumbsList(false);
            this.showOrHideCrumbsListOnWindowResize();
        },

        /**
         * Get the width of a hidden DOM element without displaying it in the browser.
         * @param element DOM element from which the width will be retrieved.
         */
        getHiddenElWidth: function (element) {
            var result,
                elementClone = $(element).clone(false);

            elementClone.css({
                visibility: 'hidden',
                position: 'absolute'
            });

            elementClone.appendTo(this.$crumbsList);

            result = elementClone.width();

            elementClone.remove();

            return result;
        },

        initCrumbs: function () {
            var that = this;

            //Remove text node in order to avoid displaying white spaces between li elements and thus make width
            //calculation for the breadcrumbs resize easier.
            $(this.$crumbsList).contents().filter(function () {
                return this.nodeType === 3;  //3 => Text node
            }).remove();

            //For each li element save its width in a data-width attribute
            $.each(this.$crumbs, function (key, value) {
                var $crumb = $(this);
                that.storeCrumbWidth($crumb);
            });
        },

        /**
         * Save width of the li element passed as parameter inside an li attribute named data-width
         * @param $crumb li element on which its width will be stored
         * @return calculated crumb width
         */
        storeCrumbWidth: function ($crumb) {
            var crumbWidth = this.getHiddenElWidth($crumb);
            $crumb.attr('data-width', crumbWidth);
            return crumbWidth;
        },

        /**
         * Run the showOrHideCrumb function for each li element contained into the ul element.
         * For the first li element ellipsis is used to display the crumb when there is not enough space in the rcrumbs
         * div container.
         */
        showOrHideCrumbsList: function (isAnimationActivated) {
            var that = this;
            this.remainingSpaceToDisplayCrumbs = this.$element.width();
            this.nbCrumbDisplayed = 0;
            this.totalCrumbsWidth = 0;
            this.nextCrumbToShowWidth = undefined;

            this.options.callback.preCrumbsListDisplay(this);

            //It's important to loop through a reversed list in order to ensure we first try to display the last element
            $.each(this.reversedCrumbs, function (key, value) {
                var $crumb = $(this),
                    $nextCrumb = $(that.reversedCrumbs[key + 1]); //May return empty jQuery object

                that.showOrHideCrumb($crumb, $nextCrumb, key, isAnimationActivated);
            });

            this.lastNbCrumbDisplayed = this.nbCrumbDisplayed;

            this.options.callback.postCrumbsListDisplay(this);

        },

        /**
         * Display a crumb (li element) if there is enough remaining space in the rcrumb div container otherwise hide it
         * It's also possible to display a crumb even if there is not enough space, by activating ellipsis plugin
         * option.
         */
        showOrHideCrumb: function ($crumb, $nextCrumb, crumbPosition, isAnimationActivated) {
            this.options.callback.preCrumbDisplay($crumb);

            var that = this;
            this.remainingSpaceToDisplayCrumbs -= $crumb.data('width');

            if (this.remainingSpaceToDisplayCrumbs >= 0) {
                //Stop using ellipsis when there is enough space to display the crumb
                if (this.options.ellipsis && crumbPosition === 0) {
                    disableEllipsis();
                }

                if (this.lastNbCrumbDisplayed < (this.nbCrumbDisplayed + 1) && isAnimationActivated) {
                    showCrumb(true);
                } else {
                    showCrumb();
                }

                this.totalCrumbsWidth += $crumb.data('width');
            } else {
                if (this.options.ellipsis && crumbPosition === 0) {
                    showCrumb();
                    enableEllipsis();
                } else {
                    if (crumbPosition > 0) { //Never hide the first crumb
                        if (this.lastNbCrumbDisplayed > this.nbCrumbDisplayed - 1 && this.options.animation.activated) {
                            hideCrumbWithAnimation();
                        } else {
                            $crumb.hide();
                        }

                        if (!this.nextCrumbToShowWidth) {
                            this.nextCrumbToShowWidth = $crumb.data('width');
                        }
                    }
                }
            }

            function showCrumb(withAnimation) {
                $crumb.removeAttr("style");

                $crumb.css('display', 'inline-block');
                /* Hack to ensure li are displayed on one line with IE6 + IE7 */
                $crumb.css('*display', 'inline');
                $crumb.css('*zoom', '1');

                if (withAnimation) {
                    $crumb.width(0);
                    $crumb.animate({width: $crumb.attr('data-width')}, that.options.animation.speed,function(){
                        that.nbCrumbDisplayed += 1;
                        that.options.callback.postCrumbDisplay($crumb);
                    });
                }else{
                    that.nbCrumbDisplayed += 1;
                    that.options.callback.postCrumbDisplay($crumb);
                }
            }

            function hideCrumbWithAnimation() {
                $crumb.animate({width: 0}, that.options.animation.speed, function () {
                    $crumb.hide();
                });
            }

            function enableEllipsis() {
                $crumb.css({
                    'text-overflow': 'ellipsis',
                    'width': (that.remainingSpaceToDisplayCrumbs + $crumb.data('width')) + 'px',
                    'overflow': 'hidden'
                });
            }

            function disableEllipsis() {
                $crumb.css({
                    'text-overflow': 'normal',
                    'width': 'auto',
                    'overflow': 'auto'
                });
            }
        },

        showOrHideCrumbsListOnWindowResize: function () {
            var that = this;
            $(window).resize(function () {
                var rcrumbWidth = that.$element.width();
                if (rcrumbWidth < that.totalCrumbsWidth || (that.totalCrumbsWidth + that.nextCrumbToShowWidth) < rcrumbWidth) {
                    $.each(that.reversedCrumbs, function (key, value) { //Stop all crumbs animations
                        var $currentCrumb = $(this);
                        $currentCrumb.stop(true, true);
                    });
                    that.showOrHideCrumbsList(that.options.animation.activated);
                }
            });
        }
    };

    // Plugin wrapper around the constructor to prevent against multiple instantiations
    $.fn[rcrumbs] = function (options) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + rcrumbs)) {
                $.data(this, 'plugin_' + rcrumbs, new Plugin(this, options));
            }
        });
    };
})(jQuery, window, document);