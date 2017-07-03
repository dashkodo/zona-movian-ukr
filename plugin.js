/**
 * zona.ru plugin for Movian Media Center
 *
 *  Copyright (C) 2017 dashkodo
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

(function (plugin) {

	var logo = plugin.path + "logo.png";
	var pluginDescriptor = plugin.getDescriptor();
	var service = plugin.createService(pluginDescriptor.title, pluginDescriptor.id + ":start", "video", true, logo);

	var settings = plugin.createSettings(pluginDescriptor.title, logo, pluginDescriptor.synopsis);

	settings.createString('baseURL', "Base URL without '/' at the end", 'http://www.torrentino.online', function (v) {
		service.baseURL = v;
	});

	settings.createString("userCookie", "Cookie пользователя", "DONT_TOUCH_THIS", function (v) {
		service.userCookie = v;
	});

	var blue = '6699CC',
	orange = 'FFA500',
	red = 'EE0000',
	green = '008B45';

	function colorStr(str, color) {
		return '<font color="' + color + '">' + str + '</font>';
	}

	function setPageHeader(page, title) {
		if (page.metadata) {
			page.metadata.title = title;
			page.metadata.logo = logo;
		}
		page.type = "directory";
		page.contents = "items";
		page.loading = false;
	}

	plugin.addURI(plugin.getDescriptor().id + ":start", function (page) {
		setPageHeader(page, plugin.getDescriptor().synopsis);
		page.loading = true;
		var doc = showtime.httpReq('http://zsolr.zonasearch.com/solr/movie/select/?q=(playable:true)AND(serial:false)&rows=50&sort=id+desc&version=2.2&wt=json').toString();
		doc = showtime.JSONDecode(doc);
		if (doc) {
			var docs = doc.response.docs

				for (var i = 0; i < docs.length; i++) {
					var item = docs[i];
					page.appendItem(plugin.getDescriptor().id + ":movie:" + item.id, "video", {
						title: item.name_rus + '/' + item.name_original,
						icon: 'https://img4.zona.mobi/images/film_240/' + item.id.toString().substring(0, 3) + "/" + item.id + '.jpg',
						description: item.description
					});
				}
		}
		page.loading = false;
	});

	plugin.addURI(plugin.getDescriptor().id + ":movie:(.*)", function (page, id) {
		setPageHeader(page, plugin.getDescriptor().synopsis);
		page.loading = true;
		var doc = showtime.httpReq('http://zsolr2.zonasearch.com/solr/torrent/select/?q=(kinopoisk_id:' + id + ')AND(languages_parser:*uk*)AND(playable:true)&wt=json').toString();
		doc = showtime.JSONDecode(doc);
		if (doc.response.docs.length == 0) {
			doc = showtime.httpReq('http://zsolr2.zonasearch.com/solr/torrent/select/?q=(kinopoisk_id:' + id + ')AND(playable:true)&wt=json').toString();
			doc = showtime.JSONDecode(doc);
		}

		if (doc) {
			var docs = doc.response.docs

				for (var i = 0; i < docs.length; i++) {
					var item = docs[i];
					page.appendItem('torrent:browse:' + item.torrent_download_link, "video", {
						title: item.resolution + '/' + Math.round(10 * item.size_bytes / (1024 * 1024 * 1024)) / 10 + 'Gb [' + item.languages_parser + '] ' + item.peers + '/' + item.seeds + ' ' + item.filenames,
						icon: 'https://img4.zona.mobi/images/film_240/' + id.toString().substring(0, 3) + "/" + id + '.jpg',
						description: item.description
					});
				}
		}
		page.loading = false;
	});

	plugin.addSearcher(plugin.getDescriptor().id, logo, function (page, query) {
		page.entries = 0;
		var fromPage = 0,
		tryToSearch = true;

		function loader() {
			if (!tryToSearch)
				return false;
			page.loading = true;
			//http://zsolr.zonasearch.com/solr/movie/select/?q=(*)&sort=last_update+desc&version=2.2&wt=json
			//movie http://zsolr2.zonasearch.com/solr/torrent/select/?q=(kinopoisk_id:694051)AND(languages_parser:*uk*)
			var doc = showtime.httpReq('http://zsolr.zonasearch.com/solr/movie/select/?q=((name_rus:' + encodeURIComponent(query) + ')OR(name_original:' + encodeURIComponent(query) + '))AND(playable:true)&wt=json').toString();
			console.log('search finished:' + doc);

			doc = showtime.JSONDecode(doc);
			if (doc) {
				var docs = doc.response.docs

					for (var i = 0; i < docs.length; i++) {
						var item = docs[i];
						page.appendItem(plugin.getDescriptor().id + ":movie:" + item.id, "video", {
							title: item.name_rus + '/' + item.name_original,
							icon: 'https://img4.zona.mobi/images/film_240/' + item.id.toString().substring(0, 3) + "/" + item.id + '.jpg',
							description: item.description
						});

					}
					page.entries = docs.length;
			}

			page.loading = false;
			tryToSearch = false;
			return true;
		};
		loader();
		page.paginator = loader;
	});
})(this);
