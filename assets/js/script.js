$.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();

    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

function randomString(length) {
	return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
}

window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

if (!window.indexedDB) {
	window.alert("Il browser non supporta una versione stabile di IndexedDB.")
}

var db;
var request = window.indexedDB.open("PRONTOPRO", 1);

request.onerror = function(event) {
	console.log("Errore durante l'apertura del database");
};

request.onsuccess = function(event) {
	db = request.result;
	console.log("Database aperto correttamente: "+db);
	readAll();
};

request.onupgradeneeded = function(event) {
	var db = event.target.result;
	var objectStore = db.createObjectStore("forms", {keyPath: "nonce"});
}

function insertData(data) {
	var request = db.transaction(["forms"], "readwrite")
	.objectStore("forms")
	.add({ form_data: data[0], ajax_url: data[1], nonce: data[2] });

	request.onsuccess = function(event) {
		console.log("Il contenuto è stato aggiunto");
	};

	request.onerror = function(event) {
		console.log("Impossibile inserire il contenuto poiché è già presente nel database");
	};
}

function removeData(nonce) {
	var request = db.transaction(["forms"], "readwrite")
	.objectStore("forms")
	.delete(nonce);

	request.onsuccess = function(event) {
		console.log("Il contenuto è stato rimosso");
		window.location.reload();
	};
}

/* function readData(nonce) {
	var transaction = db.transaction(["forms"]);
	var objectStore = transaction.objectStore("forms");
	var request = objectStore.get(nonce);

	request.onerror = function(event) {
		console.log("Impossibile recuperare il contenuto dal database");
	};

	request.onsuccess = function(event) {
		if (request.result) {
			console.debug(request.result);
		} else {
			console.log("Impossibile trovare il contenuto nel database");
		}
	};
} */

function readAll() {
	var objectStore = db.transaction("forms").objectStore("forms");
	var i = 1;

	objectStore.openCursor().onsuccess = function(event) {
		var cursor = event.target.result;
		var htmlSubmission = '';

		if (cursor) {
			htmlSubmission += '<div class="submission">';

			htmlSubmission += '<p><strong>Submission #'+i+'</strong></p>';		
			JSON.parse(cursor.value.form_data, function(key, value) {
				if ("" !== key) {
					htmlSubmission += '<p>'+key+': '+value+'</p>';
				}
			});
			htmlSubmission += '<button class="btn btn-danger delete" data-nonce="'+cursor.value.nonce+'">Elimina</button>';
			/* htmlSubmission += '<a href="#" class="btn edit" data-ajax-url="'+cursor.value.ajax_url+'" data-nonce="'+cursor.value.nonce+'">Modifica</button>'; */
			htmlSubmission += '</div><hr>';

			cursor.continue();
			i++;
		} else {
			console.log("Caricamento terminato");
		}
		$('#submissions').append(htmlSubmission);
	};

	$(document).on('click', '.delete', function() {
		if (window.confirm("Rimuovere questo contenuto?")) {
			var nonce = $(this).data('nonce');
			removeData(nonce);
		}
	});
	/* $(document).on('click', '.edit', function() {
		var ajaxUrl = $(this).data('ajax-url');
		var nonce = $(this).data('nonce');
		renderForm(ajaxUrl, nonce);
	}); */
}

function renderForm(source, nonce) {
	$.ajax({
		url: source,
		cache: false
	})
	.done(function(data) {
		var htmlForm = '';
		var extraHtmlForm;
		/* var returnValues;

		if ('' !== nonce) {
			returnValues = readData(nonce);
		}
		console.debug(returnValues); */

		for (var i = 0; i < data.length; i++) {

			for (var j = 0; j < data[i].rules.length; j++) {

				switch (data[i].rules[j].type) {
					case 'min':
						extraHtmlForm = 'min="'+data[i].rules[j].options.val+'"';
						break;
					case 'max':
						extraHtmlForm += 'max="'+data[i].rules[j].options.val+'"';
						break;
					case 'pattern':
						extraHtmlForm = 'pattern="'+data[i].rules[j].options.pattern+'"';
						break;
					case 'required':
						extraHtmlForm = 'required';
						break;
					default:
						extraHtmlForm = '';
						break;
				}
			};

			switch (data[i].type) {
				case 'checkbox':
					htmlForm += '<div class="checkbox"><label><input type="checkbox" name="'+data[i].name+'" '+extraHtmlForm+'> '+data[i].label+'</label></div>';
					break;
				case 'textarea':
					htmlForm += '<textarea name="'+data[i].name+'" class="form-control" rows="3" '+extraHtmlForm+'></textarea>';
					break;
				default:
					htmlForm += '<div class="form-group"><label for="'+data[i].name.toLowerCase()+'">'+data[i].label+'</label><input type="'+data[i].type+'" name="'+data[i].name+'" class="form-control" id="'+data[i].name.toLowerCase()+'" '+extraHtmlForm+'></div>';
					break;
			}
		}
		htmlForm += '<input class="btn btn-success pull-right" id="submit" type="submit" value="Invia">';

		$("form#form").html(htmlForm);
	});
}

$(function() {
	var ajaxUrl;
	
	$("#autocomplete").autocomplete({
		source: "https://prontopro.getsandbox.com/autocomplete",
		minLength: 0,
		focus: function(event, ui) {
			$("#autocomplete").val(ui.item.label);
			return false;
		},
		select: function(event, ui) {
			ajaxUrl = ui.item.url;
			nonce = randomString(8);

			renderForm(ui.item.url);
		}
    })
	.autocomplete("instance")._renderItem = function(ul, item) {
		var response = '';
		if (item.label.indexOf($("#autocomplete").val()) > -1) {
			response += "<li><a>" + item.label + "</a></li>";
		}
		if (null !== item.label) {
			return $(response)
			.appendTo(ul);
		}
	};

	$('#form').submit(function(e) {
		e.preventDefault();

		var formData = [JSON.stringify($('form').serializeObject()), ajaxUrl, nonce];
		insertData(formData);

		window.location.reload();
	});
});
