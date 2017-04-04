// ==UserScript==
// @name         iqdb quick post
// @namespace    IQDB
// @version      1.7b
// @homepage     https://github.com/7kill/iqdb-tags
// @description  Quick tag/link buttons for iqdb boards. Auto hash-tags generator. Search in iqdb by button
// @author       7KiLL
// @require      https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/1.5.12/clipboard.min.js
// @match        *://yande.re/post/show/*
// @match        *://konachan.com/post/show/*
// @match        *://gelbooru.com/index.php?page=post&s=view&id=*
// @match        *://danbooru.donmai.us/posts/*
// @match        *://e-shuushuu.net/*
// @match        *://chan.sankakucomplex.com/post/show/*
// @match        *://anime-pictures.net/pictures/view_post/*
// @match        *://mangadrawing.net/Image/*
// @match        *://www.zerochan.net/*
// @grant        none
// ==/UserScript==
/**
 * Created by 7KiLL on 28/07/16.
 * UPD 1.7b:   Refactored some part of code, totally fixed zerochan bugs
 * UPD 1.6.1:  Fixed bugs with zerochan tags check and image link for zerochan
 * UPD 1.6b:   Added zerochan, anime-pictures, manga-drawing.
 * UPD 1.5.1b: characters replacing fixes
 * UPD 1.5:    forEach rework. Dunno how did it work in Chrome, but Firefox make me to fix this
 * UPD 1.4:    Some HTML fixes, code beautify
 * UPD 1.3:    Image extract priority (was an issue when VK loaded image as document), iqdb search tweaks.
 * UPD 1.2:    iqdb search release, much code refactoring
 * UPD 1.1:    Sankaku added
 */
//Helpers
String.prototype.clearHash = function () {
    var clean = this
        .replace(/ /g, '_')
        .replace(/(\(|{|\[).+(\]|}|\))/, '')
        .replace(/(!|\?)/g, '')
        .replace(/:/g, '_')
        .replace(/@/g, 'a')
        .replace(/\//g, '_')
        .replace(/\.+/,'')
        .replace(/\(\w+.../, '')
        .replace(/(^_+|_+$)/, '');
    clean = '#' + clean;
    return clean;
};

//Loading out CSS file
{
    //CSS file link
    var css_link = 'https://dl.dropboxusercontent.com/s/tew2n6b4y682hos/iqdb.css';
    //
    var head  = document.getElementsByTagName('head')[0];
    var link  = document.createElement('link');
    link.id   = 'iqdbCss';
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = css_link;
    link.media = 'all';
    head.appendChild(link);
}

var Global = {}; //Declare Global object before core script because iqdb{} uses it
//Script functions
var iqdb = {
    loadSettings: function (e) {
        var input = e;
        if(typeof e == "string")
            input = document.querySelector(e);
        var data = input.getAttribute('data-store');
        if(input.getAttribute('type')=="checkbox") {
            if(localStorage.getItem(data)=="false"){
                localStorage.setItem(data, "false");
                input.checked = false;
            }
            else
                input.checked = true;

            input.onclick = function () {
                localStorage.setItem(data, input.checked);
                Global.updateTags();
            };
        }
        if(input.getAttribute('type')=="text") {
            if(localStorage.getItem(data))
                input.value = localStorage.getItem(data);
            input.oninput  = function () {
                localStorage.setItem(data, input.value);
                Global.updateTags();
            };
        }
    },
    searchRequest: function (e) {
        //Thanks to http://stackoverflow.com/a/19655662
        var classname = document.getElementsByClassName(e);

        var iqdbSearch = function() {
            var link = 'http://iqdb.org?url=' + this.getAttribute('data-img');
            window.open(link, "_blank");
        };

        for (var i = 0; i < classname.length; i++) {
            classname[i].addEventListener('click', iqdbSearch, false);
        }
    },
    unique: function (arr) {
        var obj = {};

        for (var i = 0; i < arr.length; i++) {
            var str = arr[i];
            obj[str] = true; // запомнить строку в виде свойства объекта
        }

        return Object.keys(obj); // или собрать ключи перебором для IE8-
    },
    checkStorage: function (param, value) {
        if(!localStorage.getItem(param))
            localStorage.setItem(param, value);
    },
    createInput: function (type, id, text, data) {
        var name = Global.name;
        if(type == 'checkbox')
            name = '"' + Global.name + ' check"';
        var input;
        input = '<li class=' + name + '>' +
            '<label class='+ name +' for='+ id +'>'+ text +'</label>' +
            '<input class='+ name +' type='+ type +' data-store='+ data +' id='+ id +'>' +
            '</li>';
        return input;
    },
    createButton: function (id, text, method, shuu) {
        var btn;
        shuu = shuu || '';
        btn = '<button class="btn ' + Global.name + shuu + '" id="' + id +
            '" data-clipboard-text="' + method + '">'+
            text +'</button>';
        return btn;
    },
    createSearchButton: function (e) {
        var btn;
        btn = '<button data-img='+ e + ' class="btn iqdb-search ' + Global.name + '">iqdb</button>';
        return btn;
    },
    getTags: function (e) {
        e = e || document;
        var callback = "original";
        var tags = e.querySelectorAll(Global.selectors.copyright);
        var tagsArray  = [];
        if(!tags.length) {
            tagsArray.push(callback);
        }
        else {
            [].forEach.call(tags, function(el) {
                if(Global.name == "zerochan") {
                    if(/Game|Series/.test(el.parentNode.innerHTML))
                        tagsArray.push(el.innerHTML);
                }
                else
                    tagsArray.push(el.innerHTML);
            });
            if(Global.name == "zerochan" && !tagsArray.length)
                tagsArray.push(callback);
        }
        //Chars
        if(localStorage.getItem('char')=="true"){
            var chars = e.querySelectorAll(Global.selectors.characters);
            [].forEach.call(chars, function(el) {
                if(Global.name == "zerochan") {
                    if(/Character/.test(el.parentNode.innerHTML))
                        tagsArray.push(el.innerHTML);
                }
                else
                    tagsArray.push(el.innerHTML);
            });
        }
        //Artist
        if(localStorage.getItem('artist')=="true"){
            var artist = e.querySelectorAll(Global.selectors.artist);
            [].forEach.call(artist, function(el) {
                if(Global.name == "zerochan") {
                    if(/Mangaka/.test(el.parentNode.innerHTML))
                        tagsArray.push(el.innerHTML);
                }
                else
                    tagsArray.push(el.innerHTML);
            });
        }
        tagsArray = iqdb.unique(tagsArray);
        var hashTags = tagsArray.map(function (name) {
            return name.clearHash() + localStorage.getItem('postfix');
        });
        return hashTags.join(localStorage.getItem('divider'));
    },
    getImage: function (e, planB) {
        e = e || document;
        planB = planB || '#image';
        var link;
        try{link = e.querySelector(planB).src;}
        catch(e){}
        Global.images.forEach(function (el) {
            var img = e.querySelector(el);
            if(img!=null)
                link = img.href || img.src;
        });
        return link;
    }
};


    console.log('Script has been started');

    //Before we load our board handler. That's necessary because core class loads inputs
    iqdb.checkStorage('divider', ' | ');
    iqdb.checkStorage('postfix', '');

    //Konachan
    var Konachan = {
        name: 'konachan',
        status: 'beta',
        selectors: {
            copyright: '.tag-type-copyright > a:nth-child(2)',
            artist: '.tag-type-artist > a:nth-child(2)',
            characters: '.tag-type-character > a:nth-child(2)'
        },
        images: [
            '#highres-show',
            "#highres"
        ],
        render: function () {

            var settings = '<h5 id="sett">Settings</h5>';
            var chars = iqdb.createInput('checkbox', '_chars', 'Characters?', 'char');
            var artist = iqdb.createInput('checkbox', '_artist', 'Artist?', 'artist');

            var postfix = iqdb.createInput('text', '_postfix', 'Append after tag', 'postfix');
            var divider = iqdb.createInput('text', '_divider', 'Separator', 'divider');

            var btnTags = iqdb.createButton('_tags', 'Tags', iqdb.getTags());
            var btnImage = iqdb.createButton('_image', 'Image', iqdb.getImage());

            var btnSearch = iqdb.createSearchButton(iqdb.getImage());
            var parent = document.querySelector('.sidebar');
            parent.insertAdjacentHTML('afterbegin', btnTags + btnImage + btnSearch + '<hr>' +
                settings + '<ul class='+ Global.name +'>' +
                '' +  postfix + divider + chars + artist +
                '</ul>');
        },
        updateTags: function () {
            var tagButton = document.getElementById('_tags');
            tagButton.setAttribute('data-clipboard-text', iqdb.getTags());
        }
    };
    if(/konachan/i.test(location.href))
        Global = Konachan;
    //yande.re
    var Yandere = {
        name: 'yandere',
        status: 'beta',
        selectors: {
            copyright: '.tag-type-copyright > a:nth-child(2)',
            artist: '.tag-type-artist > a:nth-child(2)',
            characters: '.tag-type-character > a:nth-child(2)'
        },
        images: [
            '#highres-show',
            "#highres"
        ],
        render: function () {
            var settings = '<h5 id="sett">Settings</h5>';
            var chars = iqdb.createInput('checkbox', '_chars', 'Characters?', 'char');
            var artist = iqdb.createInput('checkbox', '_artist', 'Artist?', 'artist');

            var postfix = iqdb.createInput('text', '_postfix', 'Append after tag', 'postfix');
            var divider = iqdb.createInput('text', '_divider', 'Separator </br>', 'divider');

            var btnTags = iqdb.createButton('_tags', 'Tags', iqdb.getTags());
            var btnImage = iqdb.createButton('_image', 'Image', iqdb.getImage());
            var btnSearch = iqdb.createSearchButton(iqdb.getImage());

            var parent = document.querySelector('.sidebar');
            parent.insertAdjacentHTML('afterbegin', btnTags + btnImage + btnSearch + '<hr>' +
                settings +
                '<ul class='+ Global.name +'>'+
                chars + artist + postfix + divider +
                '</ul>');
        },
        updateTags: function () {
            var tagButton = document.getElementById('_tags');
            tagButton.setAttribute('data-clipboard-text', iqdb.getTags());
        }
    };
    if(/yande/i.test(location.href))
        Global = Yandere;
    //Danbooru
    var Danbooru = {
        name: 'danbooru',
        status: 'beta',
        selectors: {
            copyright: '.category-3 > .search-tag',
            artist: '.category-1 > .search-tag',
            characters: '.category-4 > .search-tag'
        },
        images: [
            '#post-information > ul > li > a[href$=".jpg"]:first-child',
            '#post-information > ul > li > a[href$=".jpeg"]:first-child',
            '#post-information > ul > li > a[href$=".png"]:first-child'
        ],
        render: function () {
            var settings = '<strong id="sett">Settings</strong><br>';
            var chars = iqdb.createInput('checkbox', '_chars', 'Characters?', 'char');
            var artist = iqdb.createInput('checkbox', '_artist', 'Artist?', 'artist');

            var postfix = iqdb.createInput('text', '_postfix', 'Append after tag', 'postfix');
            var divider = iqdb.createInput('text', '_divider', 'Separator', 'divider');

            var btnTags = iqdb.createButton('_tags', 'Tags', iqdb.getTags());
            var btnImage = iqdb.createButton('_image', 'Image', iqdb.getImage());
            var btnSearch = iqdb.createSearchButton(iqdb.getImage());

            var parent = document.querySelector('#tag-list');
            parent.insertAdjacentHTML('afterbegin', btnTags + btnImage + btnSearch + '<hr>' +
                settings +
                '<ul class='+ Global.name +'>' +
                postfix + divider + chars + artist +
                '</ul><br>');
        },
        updateTags: function () {
            var tagButton = document.getElementById('_tags');
            tagButton.setAttribute('data-clipboard-text', iqdb.getTags());
        }
    };
    if(/danbooru/i.test(location.href))
        Global = Danbooru;
    //Gelbooru
    var Gelbooru = {
        name: 'gelbooru',
        status: 'beta',
        selectors: {
            copyright: '#tag-sidebar > li.tag-type-copyright > a:nth-child(2)',
            artist: '#tag-sidebar > li.tag-type-artist > a:nth-child(2)',
            characters: '#tag-sidebar > li.tag-type-character > a:nth-child(2)'
        },
        images: [
            'ul > li > a[style="font-weight: bold;"]'
        ],
        render: function () {
            var settings = '<strong class='+ Global.name +' id="sett">Settings</strong><br>';
            var chars = iqdb.createInput('checkbox', '_chars', 'Characters?', 'char');
            var artist = iqdb.createInput('checkbox', '_artist', 'Artist?', 'artist');

            var postfix = iqdb.createInput('text', '_postfix', 'Append after tag', 'postfix');
            var divider = iqdb.createInput('text', '_divider', 'Separator', 'divider');

            var btnTags = iqdb.createButton('_tags', 'Tags', iqdb.getTags());
            var btnImage = iqdb.createButton('_image', 'Image', iqdb.getImage());
            var btnSearch = iqdb.createSearchButton(iqdb.getImage());
            var parent = document.querySelector('div.sidebar2.sidebar4 > center > div');
            parent.insertAdjacentHTML('afterbegin', btnTags + btnImage + btnSearch + '<hr>' +
                settings +
                '<ul class='+ Global.name +'>' +
                postfix + divider + chars + artist +
                '</ul><br>');
        },
        updateTags: function () {
            var tagButton = document.getElementById('_tags');
            tagButton.setAttribute('data-clipboard-text', iqdb.getTags());
        }
    };
    if(/gelbooru/i.test(location.href))
        Global = Gelbooru;
    //Shuushuu
    var ShuuShuu = {
        name: 'shuushuu',
        status: 'beta',
        selectors: {
            copyright: 'dd[id^="quicktag2"] > .tag > a',
            artist: 'dd[id^="quicktag3"] > .tag > a',
            characters: 'dd[id^="quicktag4"] > .tag > a'
        },
        images: [
            '.thumb_image'
        ],
        createButtons: function (e) {
            var btnTags = iqdb.createButton('_tags', 'Tags', iqdb.getTags(e), ' _tags');
            var btnImage = iqdb.createButton('_image', 'Image', iqdb.getImage(e, '.thumb_image > img'));
            var btnSearch = iqdb.createSearchButton(iqdb.getImage(e, '.thumb_image > img'));

            var parent = e.querySelector('.meta');
            parent.insertAdjacentHTML('afterbegin', btnTags + btnImage + btnSearch + '<br>');
        },
        updateTags: function () {
            var posts = document.querySelectorAll('.image_thread');
            posts.forEach(function (e) {
                var tagButton = e.querySelector('._tags');
                tagButton.setAttribute('data-clipboard-text', iqdb.getTags(e));
            });
        },
        render: function () {
            var posts = document.querySelectorAll('.image_thread');
            posts.forEach(function (e) {
                ShuuShuu.createButtons(e);
            });
            var settings = '<h2 id="sett">Settings</h2>';
            var chars = iqdb.createInput('checkbox', '_chars', 'Characters?', 'char');
            var artist = iqdb.createInput('checkbox', '_artist', 'Artist?', 'artist');

            var postfix = iqdb.createInput('text', '_postfix', 'Append after tag', 'postfix');
            var divider = iqdb.createInput('text', '_divider', 'Separator', 'divider');
            var checkboxes = document.querySelector('#sidebar');
            checkboxes.insertAdjacentHTML('afterbegin', '<div class="display">' +
                settings + '<ul>' +
                chars + artist + postfix + divider +
                '</ul></div>');
        }
    };
    if(/shuushuu/i.test(location.href))
        Global = ShuuShuu;
    //Sankaku
    var Sankaku = {
        name: 'sankaku',
        status: 'beta',
        selectors: {
            copyright: '#tag-sidebar > li.tag-type-copyright > a:nth-child(1)',
            artist: '#tag-sidebar > li.tag-type-artist > a:nth-child(1)',
            characters: '#tag-sidebar > li.tag-type-character > a:nth-child(1)'
        },
        images: [
            "#lowres",
            '#highres'
        ],
        render: function () {
            var settings = '<h5 class='+ Global.name +' id="sett">Settings</h5><br>';
            var chars = iqdb.createInput('checkbox', '_chars', 'Characters?', 'char');
            var artist = iqdb.createInput('checkbox', '_artist', 'Artist?', 'artist');

            var postfix = iqdb.createInput('text', '_postfix', 'Append after tag', 'postfix');
            var divider = iqdb.createInput('text', '_divider', 'Separator', 'divider');

            var btnTags = iqdb.createButton('_tags', 'Tags', iqdb.getTags());
            var btnImage = iqdb.createButton('_image', 'Image', iqdb.getImage());
            var btnSearch = iqdb.createSearchButton(iqdb.getImage());

            var parent = document.querySelector('#search-form');
            parent.insertAdjacentHTML('beforeend','<br>' + btnTags + btnImage + btnSearch + '<hr>' +
                settings +
                '<ul class='+ Global.name +'>' +
                postfix + divider + chars + artist +
                '</ul><br>');
        },
        updateTags: function () {
            var tagButton = document.getElementById('_tags');
            tagButton.setAttribute('data-clipboard-text', iqdb.getTags());
        }
    };
    if(/sankaku/i.test(location.href))
        Global = Sankaku;
    //Anime-pictures
    var AnimePictures = {
        name: 'anime-pictures',
        status: 'alpha',
        selectors: {
            copyright: '.tags > li.green:first-of-type > a',
            artist: '.tags > li.orange > a',
            characters: '.tags > li.blue > a'
        },
        images: [
            '#big_preview',
            ".download_icon"
        ],
        render: function () {
            console.log(iqdb.getImage());
            var settings = '<h1 class='+ Global.name +' id="sett">Settings</h1>';
            var chars = iqdb.createInput('checkbox', '_chars', 'Characters?', 'char');
            var artist = iqdb.createInput('checkbox', '_artist', 'Artist?', 'artist');

            var postfix = iqdb.createInput('text', '_postfix', 'Append after tag', 'postfix');
            var divider = iqdb.createInput('text', '_divider', 'Separator', 'divider');

            var btnTags = iqdb.createButton('_tags', 'Tags', iqdb.getTags());
            var btnImage = iqdb.createButton('_image', 'Image', iqdb.getImage());
            var btnSearch = iqdb.createSearchButton(iqdb.getImage());

            var parent = document.querySelector('.sidebar_block');
            parent.insertAdjacentHTML('afterend','<br><div class='+Global.name+'>' + '<div class="'+Global.name+' title">' +
                btnTags + btnImage + btnSearch + '</div>' +
                settings +
                '<ul class='+ Global.name +'>' +
                postfix + divider + chars + artist +
                '</ul><br></div>');
        },
        updateTags: function () {
            var tagButton = document.getElementById('_tags');
            tagButton.setAttribute('data-clipboard-text', iqdb.getTags());
        }
    };
    if(/anime-pictures/i.test(location.href))
        Global = AnimePictures;
    //Manga-Drawing
    var MangaDrawing  = {
        name: 'manga-drawing',
        status: 'alpha',
        selectors: {
            copyright: '.views-field-tid-2 > .field-content > a > span',
            artist: '.views-field-tid-3 > .field-content > a > span',
            characters: '.views-field-tid-1 > .field-content > a > span'
        },
        images: [
            '.imagecache.imagecache-display'
        ],
        render: function () {
            console.log(iqdb.getImage());
            var settings = '<h3 class='+ Global.name +' id="sett">SETTINGS:</h3>';
            var chars = iqdb.createInput('checkbox', '_chars', 'Characters?', 'char');
            var artist = iqdb.createInput('checkbox', '_artist', 'Artist?', 'artist');

            var postfix = iqdb.createInput('text', '_postfix', 'Append after tag', 'postfix');
            var divider = iqdb.createInput('text', '_divider', 'Separator', 'divider');

            var btnTags = iqdb.createButton('_tags', 'Tags', iqdb.getTags());
            var btnImage = iqdb.createButton('_image', 'Image', iqdb.getImage());
            var btnSearch = iqdb.createSearchButton(iqdb.getImage());

            var parent = document.querySelector('#block-panels_mini-node_info_block_pane');
            parent.insertAdjacentHTML('afterbegin','<br><div class="'+Global.name+' iqdb-box">' + '<div class="'+Global.name+' title">' +
                btnTags + btnImage + btnSearch + '</div>' +
                settings +
                '<ul class='+ Global.name +'>' +
                postfix + divider + chars + artist +
                '</ul><br></div>');
        },
        updateTags: function () {
            var tagButton = document.getElementById('_tags');
            tagButton.setAttribute('data-clipboard-text', iqdb.getTags());
        }
    };
    if(/manga-drawing/i.test(location.href))
        Global = MangaDrawing;
    //Zerochan
    var Zerochan  = {
        name: 'zerochan',
        status: 'alpha',
        selectors: {
            copyright: '#tags > li > a',
            artist: '#tags > li > a',
            characters: '#tags > li > a'
        },
        images: [
            '#large > a'
        ],
        render: function () {
            console.log(iqdb.getTags());
            var settings = '<h2 class='+ Global.name +' id="sett">Settings</h2>';
            var chars = iqdb.createInput('checkbox', '_chars', 'Characters?', 'char');
            var artist = iqdb.createInput('checkbox', '_artist', 'Artist?', 'artist');

            var postfix = iqdb.createInput('text', '_postfix', 'Append after tag', 'postfix');
            var divider = iqdb.createInput('text', '_divider', 'Separator', 'divider');

            var btnTags = iqdb.createButton('_tags', 'Tags', iqdb.getTags());
            var btnImage = iqdb.createButton('_image', 'Image', iqdb.getImage());
            var btnSearch = iqdb.createSearchButton(iqdb.getImage());

            var parent = document.querySelector('#rectangle');
            parent.insertAdjacentHTML('afterend','<br><div class="'+Global.name+' iqdb-box">' + '<div class="'+Global.name+' title">' +
                btnTags + btnImage + btnSearch + '</div>' +
                settings +
                '<ul class='+ Global.name +'>' +
                postfix + divider + chars + artist +
                '</ul><br></div>');
        },
        updateTags: function () {
            var tagButton = document.getElementById('_tags');
            tagButton.setAttribute('data-clipboard-text', iqdb.getTags());
        }
    };
    if(/zerochan/i.test(location.href))
        Global = Zerochan;


    console.log('Core "' + Global.name + '" is running. Status: ' + Global.status);
    Global.render();

    //Initialize inputs and add listeners
    iqdb.loadSettings('#_chars');
    iqdb.loadSettings('#_artist');
    iqdb.loadSettings('#_postfix');
    iqdb.loadSettings('#_divider');

    iqdb.searchRequest('iqdb-search');

    new Clipboard('.btn');
