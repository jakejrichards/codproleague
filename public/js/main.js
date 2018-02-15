var socket = io();
var notificationSound = new Audio('../audio/notificationSound.wav');
var chatSound = new Audio('../audio/chatSound.wav');
var errorSound = new Audio('../audio/error.wav');
var loseSound = new Audio('../audio/lose.wav');
var winSound = new Audio('../audio/win.wav');

var isNotifications = ($('settings').attr('notifications') == 'true');
var isSounds = ($('settings').attr('sounds') == 'true');

socket.on("notify", function(data){
    if(isNotifications) {
        showAlert(data.status, data.message, 10000);
    }
});

socket.on("friend-request", function(data){
    var from_userID = data.from_userID;
    var from_username = data.from_username;
    var notificationCount;
    if(!($('#friend_request_' + from_userID).length > 0)) {
        notificationCount = parseInt($('#notification-number').text());
        notificationCount++;
        $('#notification-number').text(notificationCount);
        $('.notification-circle').removeClass('hidden');
        $("<li id='friend_request_"+from_userID+"' ><a href='/friends'><i class='fa fa-user-plus'></i> Friend Request</a></li>").insertAfter('#notification-count');
    }
    if(isNotifications) {
        showAlert("success", "You have a new friend request from " + from_username + " &nbsp; <a style='right: inherit' href='/friends'><button class='btn btn-success new-invite-accept'>Accept</button></a>", 7500);
    }
});

socket.on("new-invite", function(data){
    var from_userID = data.from_userID;
    var from_username = data.from_username;
    var avatarURL = data.from_avatarURL;
    var lobbyID = data.lobbyID;
    var notificationCount = parseInt($('#notification-number').text());
    if(!($('#lobby_' + lobbyID).length > 0)) {
        notificationCount++;
        $('#notification-number').text(notificationCount);
        $('.notification-circle').removeClass('hidden');
        $("<li id='lobby_"+lobbyID+"' onclick='openModal(\""+from_username+"\","+from_userID+",\""+lobbyID+"\");'><a><div class='notification-avatar' style='background-image: url("+avatarURL+")'></div> Game Invite</a></li>").insertAfter('#notification-count');
    } else if($('#lobby_' + lobbyID).hasClass('seen')) {
        notificationCount++;
        $('#notification-number').text(notificationCount);
        $('.notification-circle').removeClass('hidden');
        $('#lobby_' + lobbyID).removeClass('seen');
    }
    if(isNotifications) {
        showAlert("success","<div class='alert-avatar' style='background-image: url("+avatarURL+")'></div>" + from_username + " sent you an invite to play! <button style='padding: 3px 12px; margin-left: 1rem' onclick='openModal(\""+from_username+"\","+from_userID+",\""+lobbyID+"\");' class='btn btn-success new-invite-accept'>Accept</button>", 5000);
    }
});

socket.on("users-online", function(data){
    $('#users-online').html(data.usersOnline);
});

socket.on("current-games", function(data){
    $('#current-games').html(data.currentGames);
});

$(document).ready(function(){

    console.log("notifications: " + isNotifications + "\nsounds: " + isSounds);

    if($('.alert-text').text().length > 0) {
        setTimeout(function(){
            $('.alert').fadeOut();
        }, 10000);
    }

    $('#notification-li').on('hidden.bs.dropdown', function(){
        $('#notification-number').text('0');
        $('.notification-list li').each(function(index){
            if(index != 0) {
                $(this).addClass('seen');
            }
        });
        readNotifications();
    });

    $('#notification-li').on('shown.bs.dropdown', function(){
        if(!$('.notifications-circle').hasClass('hidden')) {
            $('.notification-circle').addClass('hidden');
        }
    });

    $('#notification-li').on('hidden.bs.dropdown', function(){
        if(!$('.notifications-circle').hasClass('hidden')) {
            $('.notification-circle').addClass('hidden');
        }
    });

    $('#new-invite-modal').modal({
        show: false
    });

    $('.alert .x').click(function(e){
        e.preventDefault();
        $('.alert').fadeOut();
    });

    $('#bet').keyup(function(e){
        if(e.keyCode == 13) {
            $('.accept-invite').click();
        }
    });

    $('.accept-invite').click(function(){
        window.location = '/accept_invite?from_userID=' + $('#new-invite-modal').attr('from') + "&lobbyID=" + $('#new-invite-modal').attr('lobby') + "&bet=" + $('#bet').val();
    });

});

function showAlert(status, msg, len) {
    if(isSounds){
        if(status == 'success') {
            console.log("play");
            notificationSound.play();
        } else if(status == 'error') {
            console.log("play");
            errorSound.play();
        }
    }
    $('.alert-text').html(msg);
    $('.alert').show("slide", { direction: 'left'}, 150, 'easeOutBack');
    setTimeout(function(){
        $('.alert').fadeOut();
    }, len);
    $(document).scrollTop('.alert');
}

function readNotifications() {
    $.get('/read_notifications', function(data){
        console.log(data);
    });
}

function clearNotifications() {
    $.get('/clear_notifications', function(data){
        console.log(data);
    });
}

function openModal(from_username, from_userID, lobbyID) {
    $('#new-invite-modal').attr('from',from_userID);
    $('#new-invite-modal').attr('lobby',lobbyID);
    $('#new-invite-modal .from_username').text(from_username);
    $('#new-invite-modal').modal('toggle');
}

function openMatch(matchID) {
    window.location = "/match/" + matchID;
}

function openLink(link) {
    window.location = link;
}

function openRuleset(id) {
    $('#' + id).slideToggle();
}

function link(link) {
    var win = window.open(link, '_blank');
    win.focus();
}