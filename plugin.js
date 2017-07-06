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

	settings.createString("userLanguage", "Preferable audio track language", "uk", function (v) {
		service.userLanguage = v;
	});

	var magnetTrackers = null;

    settings.createString("trackers", "Additional tracker list to use", "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best_ip.txt", function (v) {
		try{
			magnetTrackers = '&tr='+showtime.httpReq(v).toString().replace(/\n+/g, '&tr=');
		}
		catch (e) {

		}
	});

	var urls = {
		movies :'http://zsolr.zonasearch.com/solr/movie/select/?wt=json&',
		torrents :'http://zsolr.zonasearch.com/solr/torrent/select/?wt=json&',
	}

	var blue = '6699CC',
	orange = 'FFA500',
	red = 'EE0000',
	green = '008B45';

	function colorStr(str, color) {
		return '<font color="' + color + '">' + str + '</font>';
	}

	function mapSearchResults(page, movies){
		for (var i = 0; i < movies.length; i++) {
			var item = movies[i];
			page.appendItem(plugin.getDescriptor().id + ":movie:" + item.id, "video", {
				title: item.name_rus + '/' + item.name_original,
				//icon: 'https://img4.zonapic.com/images/film_240/' + item.id.toString().substring(0, 3) + "/" + item.id + '.jpg',
				description: item.description
			}).bindVideoMetadata({title: (item.name_original ? item.name_original : item.name_rus)});
		}
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
		var doc = showtime.httpReq(urls.movies+'q=(playable:true)AND(serial:false)AND(trailer:false)&rows=50&sort=popularity+desc').toString();
		doc = showtime.JSONDecode(doc);
		if (doc) {
			mapSearchResults(page, doc.response.docs);
		}
		page.loading = false;
	});

	plugin.addURI(plugin.getDescriptor().id + ":movie:(.*)", function (page, id) {
		setPageHeader(page, plugin.getDescriptor().synopsis);
		page.loading = true;
		var allLanguagesQuery = urls.torrents+ 'q=(kinopoisk_id:' + id + ')AND(playable:true)';
		var doc = showtime.httpReq(allLanguagesQuery +'AND(languages_parser:*'+service.userLanguage+'*)').toString();
		doc = showtime.JSONDecode(doc);
		if (doc.response.docs.length == 0) {
			doc = showtime.httpReq(allLanguagesQuery).toString();
			doc = showtime.JSONDecode(doc);
		}

		if (doc) {
			var docs = doc.response.docs

				for (var i = 0; i < docs.length; i++) {
					var item = docs[i];
					var magnetLink = item.torrent_download_link;
					if(magnetTrackers!=null){
						magnetLink+=magnetTrackers;
					}
					page.appendItem('torrent:browse:' + magnetLink, "video", {
						title: item.resolution + '/' + Math.round(10 * item.size_bytes / (1024 * 1024 * 1024)) / 10 + 'Gb [' + item.languages_parser + '] ' + item.peers + '/' + item.seeds + ' ' + item.filenames,
						icon: 'https://img4.zonapic.com/images/film_240/' + id.toString().substring(0, 3) + "/" + id + '.jpg',
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
			query = query.split(' ')
			var rusQuery = "";
			var engQuery = "";
			for(var i=0; i<query.length;query++){
				var queryWord = query[i];
			    var encodedQueryWord = encodeURIComponent(queryWord);
				if(i>0){
					rusQuery+='AND';
					engQuery+='AND';
				}
				rusQuery+='(name_rus:' + encodedQueryWord + ')';
				engQuery+='(name_original:' + encodedQueryWord + ')';
			}
			var doc = showtime.httpReq(urls.movies + 'q=((' + rusQuery + ')OR(' + engQuery + '))AND(playable:true)&rows=50&sort=gross+desc').toString();
			console.log('search finished:' + doc);

			doc = showtime.JSONDecode(doc);
			if (doc) {
				var docs = doc.response.docs;
                mapSearchResults(page, docs);
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
