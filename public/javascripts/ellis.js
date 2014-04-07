/**
 * Created with JetBrains RubyMine.
  User: smagee
 * Date: 3/11/14
 * Time: 2:15 PM
 * To change this template use File | Settings | File Templates.
 */
var map;
var marker;
var infoWindow;
var endpoint = "displacement-server-env-rtmfzur43y.elasticbeanstalk.com";
var currentPage = 0;
var totalPledges = 0;

var evictionTypeHash = {
    "omi" : '<a href="http://www.sftu.org/omi.html" target="_blank">Owner Move-In</a>',
    "ellis" : '<a href="http://www.sftu.org/ellis.html" target="_blank">Ellis Act</a>'
};

$(document).ready(function() {
    map = L.map("mapper").setView([37.760, -122.435], 12);
    L.tileLayer('http://{s}.tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/59870/256/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
    }).addTo(map);
    //initialize event handlers
    $('#find_btn').click(function() {
        findAndZoom();
    });

    $('#address').keydown(function (e){
        if(e.keyCode == 13){
            findAndZoom();
        }
    });

    $('#pet_link').click(function(){
        submitPledge();
        $('#petition').fadeOut(600, function () {
            $('#feedback').fadeIn(800)
        });
    });

    $('#tw_btn').click(function() {
        window.open("https://twitter.com/intent/tweet?text=I+Pledged+not+to+rent+or+buy+Ellis-Acted+buildings.+You+can+too&url=http://www.antievictionmappingproject.net/ellis.html&via=antievictionmap", '1369959514879','width=700,height=500,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0');
    });


    $('#searchPledgelink').click(function() {
        scrollTo($('#searchPledge'), 250);
        return false;
    });

    $('.CTA').click(function() {
        scrollTo($('#searchPledge'), 250);
        return false;
    });

    $('#pledgeslink').click(function(){
        scrollTo($('#pledge_total'), 350);
        return false;
    });

    $('#learnMorelink').click(function(){
        scrollTo($('.resources'), 450); //why will scrolling to learnMore not work?
        return false;
    });

    $("#logo").click(function(){
        $("html, body").animate({ scrollTop:  0}, 300);
    });

    $('#more_btn').click(function(){
        currentPage += 1;
        retrievePledges();
    });
    $('#back_btn').click(function(){
        currentPage -= 1;
        retrievePledges();
    });
    retrievePledges();
});

function scrollTo(element, time) {
    if (time == null) {
        time = 500;
    }
    var tt = element.offset().top - $('#main_menu').height();
    $("html, body").animate({ scrollTop:  tt}, time);
}

function findAndZoom() {
    var geocoder = new google.maps.Geocoder();
    var address = $("#address")[0].value;
    geocoder.geocode( { 'address': address, 'componentRestrictions':{'locality': 'San+Francisco'}}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            var pt = [results[0].geometry.location.k, results[0].geometry.location.A];
            map.setView(pt, 16);
            marker = L.marker(pt).addTo(map);
            var add = results[0].address_components;
            var reqStr ="num="+ encodeURI(add[0].short_name)+"&st="+encodeURI(add[1].short_name);
            var addressTxt = add[0].short_name + " " + add[1].short_name;
            fetchEllisInfo(reqStr, addressTxt, function(result) {
                openInfoWindow(result, addressTxt);
            });
            $('#instructions').hide();
        } else {
            alert("Geocode was not successful for the following reason: " + status);
        }
    });
}

function fetchEllisInfo(addressQuery, addressTxt, callback) {
    $.ajax({
        url: "http://"+endpoint+"/properties?"+addressQuery,
        type: 'GET',
        success: function(result) {
            callback(result, addressTxt);
        }
    });
}

function submitPledge() {
    var data = {
        firstName: $('#pt_firstname').val(),
        lastName: $('#pt_lastname').val(),
        email: $('#pt_email').val(),
        reason: $('#pt_reason').val(),
        anonymous: !($('#pt_usable').is(':checked'))
    };
    $.ajax({
        url: "http://"+endpoint+"/pledges",
        data: data,
        type: 'POST',
        success: function(result) {
            retrievePledges();
        }
    });
}

function openInfoWindow(result, addressTxt) {
    var obj = result;
    var text;
    if (obj.evictions && obj.evictions.length > 0) {
        var subtext = "<div class='info_table'><table>";
        var max_units = 0;
        var protected = obj.hasOwnProperty("protected_tenants") ? obj.protected_tenants : 0;
        var omi = false;
        var ellis = false;
        for (var i = 0; i < obj.evictions.length; i++) {
            var ev = obj.evictions[i];
            if (ev.eviction_type == "ellis") {
                ellis = true;
            } else if (ev.eviction_type == "omi") {
                omi = true;
            }
            var d = new Date(ev.date);
            if (ev.hasOwnProperty("units")) {
                max_units = Math.max(max_units, ev.units);
            }
            subtext += "<tr><td class='ev_date'>"+ d.toLocaleDateString() + "<br />" + evictionTypeHash[ev.eviction_type] + "</td><td class='ev_landlords'>";
            if (ev.hasOwnProperty("landlords")){
                subtext += "Landlords: " + ev.landlords[0];
                for (var j = 1; j < ev.landlords.length; j++) {
                    subtext += " &bull; " + ev.landlords[j];
                }
            } else if (ev.hasOwnProperty("unit")){
                subtext += ev.unit;
            } else {
                subtext += "Detailed unit info not available";
            }
            subtext += "</td></tr></div>";
        }
        subtext += "</table></div>";
        var add_class = obj.dirty_dozen != null ? 'info_address with_dd' : 'info_address without_dd';
        text = "<div class='info_window'><div class='" + add_class +"'>"+ addressTxt+"</div>";
        if (obj.dirty_dozen != null) {
            text += "<div class='dirty_dozen'><p class='dd_hdr' id='dd_hdr'>A Dirty Dozen Eviction<a href='" + obj.dirty_dozen + "' id='dd_lrn'>Learn More</a></p></div>";
        }
        var evTypesText, evUnitsNum, evDataType;
        if (omi){
            if ( ellis) {
                evTypesText = "Total <br/ >Evictions"
                evUnitsNum = max_units;
                evDataType = "Landlord/Unit info";
            } else  {
                evTypesText = "Owner Move-in<br />Evictions";
                evUnitsNum = obj.evictions.length;
                evDataType = "Unit Info"
            }
        } else {
            evTypesText = "Ellis Act<br />Evictions"
            evUnitsNum = max_units;
            evDataType = "Landlord info";
        }
        text += "<div class='header_nums'>" +
                 "<div class='total_col' style='width:33%'><div class='circle_num redbg'>"+ obj.evictions.length +"</div><div class='ig_text red'>"+evTypesText+"</div></div>";
        text +=  "<div class='total_col' style='width:27%'><div class='circle_num bluebg'>"+ evUnitsNum +"</div><div class='ig_text blue'>Affected<br />Units</div></div>";
        text +=  "<div class='total_col' style='width:40%'><div class='circle_num lightbluebg'>"+ protected +"</div><div class='ig_text lightblue'>Senior or Disabled<br />Tenants</div></div></div>";
        text += subtext;
    } else {
        text = "<div class='info_window fixed'><div class='info_address without_dd'>"+ addressTxt+"</div><div class='total_col' style='width:100%'><div class='circle_num lightbluebg'>0</div><div class='no_evictions'>" +
            "There are no evictions at the address. Awesome!</div></div></div> ";
    }
    marker.bindPopup(text, {maxWidth:500}).openPopup();
}

function retrievePledges() {
    $('.pledgeColumn').empty();

    $.ajax({
        url: "http://"+endpoint+"/pledges?limit=30&skip="+currentPage*30,
        type: 'GET',
        success: function(result) {
            var j = 0
            var sel = $('#pledgeColumn_'+j)
            var list = sel.append('<ul/>');
            for (var i = 0; i < result.length; i++){
                if (i % 10 == 0){
                    j++;
                    sel = $('#pledgeColumn_'+j);
                    list = sel.append('<ul/>');
                }
                var reason = result[i].reason ? result[i].reason : "";
                var blob = '<li class="pledger"><span class="name">'+result[i].name+'</span> <span class="reason">' + reason + '</span></li>';
                list.append(blob);
            }
            adjustButtons();
        }
    });

    $.ajax({
        url: "http://"+endpoint+"/pledges/total",
        type: 'GET',
        success: function(result) {
            $('#pledge_total').text(result+" people have pledged");
            adjustButtons();
            totalPledges = result;
        }
    })
}

function adjustButtons() {
    if (currentPage == 0) {
        $('.previous').hide();
    } else {
        $('.previous').show();
    }
    if (totalPledges / 30 > currentPage + 1) {
        $('.more').show();
    } else {
        $('.more').hide();
    }
}